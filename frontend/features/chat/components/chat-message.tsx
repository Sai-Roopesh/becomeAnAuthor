'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { MoreVertical, Copy, Save, RefreshCw, Trash2, Pencil, Sparkles, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/config/types';
import { FEATURE_FLAGS } from '@/lib/config/constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from '@/lib/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';
import { useChatRepository } from '@/features/chat/hooks/use-chat-repository';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
    message: ChatMessageType;
    threadId: string;
    onRegenerate?: (message: ChatMessageType) => void;
}

export function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
    const chatRepo = useChatRepository();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const { confirm, ConfirmationDialog } = useConfirmation();

    const isUser = message.role === 'user';

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        toast.success('Message copied to clipboard');
    };

    const handleSaveAsSnippet = async () => {
        // Feature hidden by FEATURE_FLAGS
    };

    const handleRetry = () => {
        // Feature hidden by FEATURE_FLAGS
    };

    const handleEdit = () => {
        setEditContent(message.content);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        try {
            // Update current message
            await chatRepo.updateMessage(message.id, {
                content: editContent
            });

            // Cascade delete subsequent messages
            const allMessages = await chatRepo.getMessagesByThread(message.threadId);

            const messagesToDelete = allMessages.filter(
                m => m.timestamp > message.timestamp
            );

            if (messagesToDelete.length > 0) {
                // Delete them one by one using repository
                for (const msg of messagesToDelete) {
                    await chatRepo.deleteMessage(msg.id);
                }
                toast.success(`Message updated and ${messagesToDelete.length} subsequent message(s) cleared`);
            } else {
                toast.success('Message updated');
            }

            setIsEditing(false);

            // Trigger regeneration if handler provided
            if (onRegenerate) {
                onRegenerate({
                    ...message,
                    content: editContent
                });
            }
        } catch (error) {
            console.error('Failed to update message:', error);
            toast.error('Failed to update message');
        }
    };

    const confirmDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            let messagesToDelete: ChatMessageType[] = [];
            let description: string;

            if (isUser) {
                const allMessages = await chatRepo.getMessagesByThread(message.threadId);

                const messageIndex = allMessages.findIndex(m => m.id === message.id);
                if (messageIndex !== -1) {
                    messagesToDelete = allMessages.slice(messageIndex);
                }
                const count = messagesToDelete.length;

                description = count > 1
                    ? `This will delete this message and ${count - 1} subsequent message(s). This action cannot be undone.`
                    : 'Are you sure you want to delete this message? This action cannot be undone.';
            } else {
                messagesToDelete = [message];
                description = 'Are you sure you want to delete this message? This action cannot be undone.';
            }

            const confirmed = await confirm({
                title: 'Delete Message',
                description,
                confirmText: 'Delete',
                variant: 'destructive'
            });

            if (confirmed) {
                for (const msg of messagesToDelete) {
                    await chatRepo.deleteMessage(msg.id);
                }
                toast.success(`Deleted ${messagesToDelete.length} message(s)`);
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message');
        }
    };

    if (isEditing) {
        return (
            <div className={cn(
                "p-4 rounded-2xl border shadow-sm bg-background",
                isUser ? "ml-12" : "mr-12"
            )}>
                <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] mb-3 bg-muted/30 resize-none"
                />
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                        Save & Continue
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn(
                "group relative flex gap-3",
                isUser ? "flex-row-reverse pl-12" : "pr-12"
            )}>
                {/* Avatar */}
                <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
                    isUser ? "bg-primary text-primary-foreground" : "bg-background border border-border/50 text-primary"
                )}>
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div className={cn(
                    "relative px-4 py-3 shadow-sm max-w-full overflow-hidden",
                    isUser
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                        : "bg-card border border-border/50 rounded-2xl rounded-tl-sm"
                )}>
                    <div className={cn(
                        "prose prose-sm max-w-none break-words leading-relaxed",
                        isUser ? "prose-invert" : "dark:prose-invert"
                    )}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code(props) {
                                    const { className, children, ...rest } = props;
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match;

                                    return isInline ? (
                                        <code className={cn(
                                            "px-1 py-0.5 rounded text-sm font-mono",
                                            isUser ? "bg-primary-foreground/20" : "bg-muted"
                                        )} {...rest}>
                                            {children}
                                        </code>
                                    ) : (
                                        <div className="relative my-3 rounded-lg overflow-hidden border border-border/50 bg-muted/50">
                                            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 border-b border-border/50 text-xs text-muted-foreground">
                                                <span>{match?.[1] || 'code'}</span>
                                            </div>
                                            <pre className="p-3 overflow-x-auto">
                                                <code className={cn("text-sm font-mono", className)} {...rest}>
                                                    {children}
                                                </code>
                                            </pre>
                                        </div>
                                    );
                                },
                                p({ children }) {
                                    return <p className="mb-2 last:mb-0">{children}</p>;
                                },
                                ul({ children }) {
                                    return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                                },
                                ol({ children }) {
                                    return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                                },
                                a({ children, href }) {
                                    return <a href={href} className="underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer">{children}</a>
                                }
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>

                    <div className={cn(
                        "text-[10px] mt-1 opacity-70 flex justify-end",
                        isUser ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {/* Actions Dropdown */}
                <div className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity self-start mt-2",
                    isUser ? "mr-2" : "ml-2"
                )}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-muted"
                            >
                                <MoreVertical className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isUser ? "end" : "start"}>
                            <DropdownMenuItem onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                            </DropdownMenuItem>
                            {isUser && (
                                <DropdownMenuItem onClick={handleEdit}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Message
                                </DropdownMenuItem>
                            )}
                            {FEATURE_FLAGS.SAVE_AS_SNIPPET && (
                                <DropdownMenuItem onClick={handleSaveAsSnippet}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save as Snippet
                                </DropdownMenuItem>
                            )}
                            {!isUser && FEATURE_FLAGS.RETRY_MESSAGE && (
                                <DropdownMenuItem onClick={handleRetry}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                onClick={confirmDelete}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Message
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <ConfirmationDialog />
        </>
    );
}
