'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search } from 'lucide-react';
import { useChatStore } from '@/store/use-chat-store';
import { ChatThread } from './chat-thread';

interface ChatInterfaceProps {
    projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
    const [searchQuery, setSearchQuery] = useState('');
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
                            <button
                                key={thread.id}
                                onClick={() => setActiveThreadId(thread.id)}
                                className={`w-full text-left p-2 rounded hover:bg-accent transition-colors ${activeThreadId === thread.id ? 'bg-accent' : ''
                                    }`}
                            >
                                <div className="font-medium text-sm truncate">{thread.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(thread.updatedAt).toLocaleDateString()}
                                </div>
                            </button>
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
        </div>
    );
}
