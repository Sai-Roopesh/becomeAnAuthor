'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MoreVertical, Copy, Save, RefreshCw, Trash2, Pencil } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/config/types';
import { FEATURE_FLAGS } from '@/lib/config/constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db } from '@/lib/core/database';
import { toast } from '@/lib/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';

interface ChatMessageProps {
    message: ChatMessageType;
    threadId: string;
    onRegenerate?: (message: ChatMessageType) => void;
}

export function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const { confirm, ConfirmationDialog } = useConfirmation();

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
            await db.chatMessages.update(message.id, {
                content: editContent
            });

            // Cascade delete subsequent messages
            const allMessages = await db.chatMessages
                .where('threadId')
                .equals(message.threadId)
                .sortBy('timestamp');

            const messagesToDelete = allMessages.filter(
                m => m.timestamp > message.timestamp
            );

            if (messagesToDelete.length > 0) {
                await db.chatMessages.bulkDelete(messagesToDelete.map(m => m.id));
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

            if (message.role === 'user') {
                const allMessages = await db.chatMessages
                    .where('threadId')
                    .equals(message.threadId)
                    .sortBy('timestamp');

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
                await db.chatMessages.bulkDelete(messagesToDelete.map(m => m.id));
                toast.success(`Deleted ${messagesToDelete.length} message(s)`);
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message');
        }
    };

    if (isEditing) {
        return (
            <div className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-primary/10 ml-12' : 'bg-muted mr-12'}`}>
                <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] mb-2 bg-background"
                />
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
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
            <div
                className={`group relative p-3 rounded-lg ${message.role === 'user'
                    ? 'bg-primary/10 ml-12'
                    : 'bg-muted mr-12'
                    }`}
            >
                <div className="flex items-start gap-2">
                    <div className="flex-1">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                            {message.role === 'user' ? 'You' : 'AI'}
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code(props) {
                                        const { className, children, ...rest } = props;
                                        const match = /language-(\w+)/.exec(className || '');
                                        const isInline = !match;

                                        return isInline ? (
                                            <code className="bg-muted px-1 py-0.5 rounded text-sm" {...rest}>
                                                {children}
                                            </code>
                                        ) : (
                                            <pre className="bg-muted/50 p-3 rounded-lg overflow-x-auto my-2">
                                                <code className={className} {...rest}>
                                                    {children}
                                                </code>
                                            </pre>
                                        );
                                    },
                                    p({ children }) {
                                        return <p className="mb-2 last:mb-0">{children}</p>;
                                    },
                                    ul({ children }) {
                                        return <ul className="list-disc list-inside mb-2">{children}</ul>;
                                    },
                                    ol({ children }) {
                                        return <ol className="list-decimal list-inside mb-2">{children}</ol>;
                                    },
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                            </DropdownMenuItem>
                            {message.role === 'user' && (
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
                            {message.role === 'assistant' && FEATURE_FLAGS.RETRY_MESSAGE && (
                                <DropdownMenuItem onClick={handleRetry}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                onClick={confirmDelete}
                                className="text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Message
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                </div>
            </div>

            <ConfirmationDialog />
        </>
    );
}
