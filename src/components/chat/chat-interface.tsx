import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useChatStore } from '@/store/use-chat-store';
import { ChatThread } from './chat-thread';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast-service';

interface ChatInterfaceProps {
    projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
    const { activeThreadId, setActiveThreadId } = useChatStore();

    const threads = useLiveQuery(
        () => db.chatThreads
            .where('projectId')
            .equals(projectId)
            .filter(t => !t.archived)
            .reverse()
            .sortBy('updatedAt'),
        [projectId]
    );

    const createNewThread = async () => {
        const newThread = {
            id: crypto.randomUUID(),
            projectId,
            name: 'New Chat',
            pinned: false,
            archived: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await db.chatThreads.add(newThread);
        setActiveThreadId(newThread.id);
    };

    const handleDeleteThread = async () => {
        if (!threadToDelete) return;

        try {
            // Delete thread and all its messages
            await db.transaction('rw', db.chatThreads, db.chatMessages, async () => {
                await db.chatThreads.delete(threadToDelete);
                await db.chatMessages.where('threadId').equals(threadToDelete).delete();
            });

            if (activeThreadId === threadToDelete) {
                setActiveThreadId(null);
            }

            toast.success('Chat deleted');
        } catch (error) {
            console.error('Failed to delete chat:', error);
            toast.error('Failed to delete chat');
        } finally {
            setThreadToDelete(null);
        }
    };

    const filteredThreads = threads?.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex">
            {/* Thread List Sidebar */}
            <div className="w-64 border-r flex flex-col bg-muted/10">
                <div className="p-3 border-b space-y-2">
                    <Button onClick={createNewThread} className="w-full" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                    </Button>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {filteredThreads?.map((thread) => (
                            <div
                                key={thread.id}
                                className={`group flex items-center gap-2 w-full p-2 rounded hover:bg-accent transition-colors ${activeThreadId === thread.id ? 'bg-accent' : ''
                                    }`}
                            >
                                <button
                                    onClick={() => setActiveThreadId(thread.id)}
                                    className="flex-1 text-left min-w-0"
                                >
                                    <div className="font-medium text-sm truncate">{thread.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(thread.updatedAt).toLocaleDateString()}
                                    </div>
                                </button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setThreadToDelete(thread.id);
                                    }}
                                >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Thread View */}
            <div className="flex-1">
                {activeThreadId ? (
                    <ChatThread threadId={activeThreadId} />
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <p className="text-lg mb-2">No chat selected</p>
                            <p className="text-sm">Create a new chat or select an existing one</p>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={!!threadToDelete} onOpenChange={(open) => !open && setThreadToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Chat</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this chat? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setThreadToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteThread}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
