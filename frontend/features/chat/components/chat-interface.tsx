"use client";
import { useState } from 'react';
import { useLiveQuery, invalidateQueries } from '@/hooks/use-live-query';
import { useChatRepository } from '@/features/chat/hooks/use-chat-repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Trash2, MessageSquare, Sparkles, Menu } from 'lucide-react';
import { useChatStore } from '@/store/use-chat-store';
import { ChatThread } from './chat-thread';
import { toast } from '@/shared/utils/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';

interface ChatInterfaceProps {
    projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
    const chatRepo = useChatRepository();
    const [searchQuery, setSearchQuery] = useState('');
    const { activeThreadId, setActiveThreadId } = useChatStore();
    const { confirm, ConfirmationDialog } = useConfirmation();
    const isMobile = useIsMobile();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const threads = useLiveQuery(
        () => chatRepo.getActiveThreads(projectId),
        [projectId]
    );

    const createNewThread = async () => {
        const newThread = await chatRepo.createThread({
            projectId,
            name: 'New Chat',
        });
        invalidateQueries(); // Refresh the chat list
        setActiveThreadId(newThread.id);
        if (isMobile) setSidebarOpen(false);
    };

    const handleDeleteThread = async (threadId: string) => {
        const confirmed = await confirm({
            title: 'Delete Chat',
            description: 'Are you sure you want to delete this chat? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
            try {
                // Repository handles cascade delete automatically
                await chatRepo.deleteThread(threadId);

                if (activeThreadId === threadId) {
                    setActiveThreadId(null);
                }
                invalidateQueries(); // Refresh the chat list
                toast.success('Chat deleted');
            } catch (error) {
                console.error('Failed to delete chat:', error);
                toast.error('Failed to delete chat');
            }
        }
    };

    const filteredThreads = threads?.filter(t =>
        (t.name || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const SidebarContent = (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border/50 space-y-4">
                <Button
                    onClick={createNewThread}
                    className="w-full shadow-sm bg-primary/90 hover:bg-primary transition-all"
                    size="default"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                </Button>
                <div className="relative group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50 border-transparent focus:bg-background transition-all"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                    {filteredThreads?.map((thread) => (
                        <div
                            key={thread.id}
                            className={cn(
                                "group flex items-center gap-3 w-full p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                                activeThreadId === thread.id
                                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-card hover:border-border/50 hover:shadow-sm'
                            )}
                            onClick={() => {
                                setActiveThreadId(thread.id);
                                if (isMobile) setSidebarOpen(false);
                            }}
                        >
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                                activeThreadId === thread.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary"
                            )}>
                                <MessageSquare className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={cn(
                                    "font-heading font-medium text-sm truncate transition-colors",
                                    activeThreadId === thread.id ? "text-primary" : "text-foreground"
                                )}>
                                    {thread.name || 'Untitled'}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive -mr-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteThread(thread.id);
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}

                    {filteredThreads?.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No chats found</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    return (
        <div className="h-full flex flex-col md:flex-row bg-background/95 backdrop-blur-sm relative">
            {/* Mobile Header */}
            {isMobile && (
                <div className="flex items-center p-2 border-b border-border/50 bg-background/80 backdrop-blur-md z-30 md:hidden">
                    <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[85vw] sm:w-[300px]">
                            {SidebarContent}
                        </SheetContent>
                    </Sheet>
                    <span className="ml-2 font-medium">AI Chat</span>
                </div>
            )}

            {/* Desktop Sidebar */}
            {!isMobile && (
                <div className="w-56 border-r border-border/50 flex flex-col bg-background/50 backdrop-blur-md">
                    {SidebarContent}
                </div>
            )}

            {/* Chat Thread View */}
            <div className="flex-1 flex flex-col min-w-0 bg-background/30 relative h-full overflow-hidden">
                {/* Subtle background texture */}
                <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />

                {activeThreadId ? (
                    <ChatThread threadId={activeThreadId} />
                ) : (
                    <EmptyState
                        variant="hero"
                        icon={<Sparkles className="h-10 w-10" />}
                        title="AI Assistant"
                        description="Select a chat from the sidebar or start a new conversation to brainstorm, outline, or write with AI."
                        action={{
                            label: 'Start New Chat',
                            onClick: createNewThread,
                            variant: 'outline'
                        }}
                    />
                )}
            </div>

            <ConfirmationDialog />
        </div>
    );
}
