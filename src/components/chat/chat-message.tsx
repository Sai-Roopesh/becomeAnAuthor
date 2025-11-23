'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Copy, Save, RefreshCw } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/constants';

interface ChatMessageProps {
    message: ChatMessageType;
    threadId: string;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const [showActions, setShowActions] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
    };

    const handleSaveAsSnippet = async () => {
        // Feature hidden by FEATURE_FLAGS
    };

    const handleRetry = () => {
        // Feature hidden by FEATURE_FLAGS
    };

    return (
        <div
            className={`group relative p-3 rounded-lg ${message.role === 'user'
                ? 'bg-primary/10 ml-12'
                : 'bg-muted mr-12'
                }`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                        {message.role === 'user' ? 'You' : 'AI'}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {message.content}
                    </div>
                </div>

                {showActions && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                            </DropdownMenuItem>
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
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="text-xs text-muted-foreground mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
            </div>
        </div>
    );
}
