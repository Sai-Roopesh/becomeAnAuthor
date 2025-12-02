'use client';

import { ChatMessage as ChatMessageComponent } from '../chat-message';
import type { ChatMessage } from '@/lib/config/types';
import { RefObject } from 'react';
import { Sparkles } from 'lucide-react';

interface ChatMessageListProps {
    messages: ChatMessage[] | undefined;
    isLoading: boolean;
    threadId: string;
    onRegenerateFrom: (timestamp: number) => void;
    messagesEndRef: RefObject<HTMLDivElement | null>;
}

/**
 * Chat Message List Component
 * Displays conversation messages with regeneration support
 */
export function ChatMessageList({
    messages,
    isLoading,
    threadId,
    onRegenerateFrom,
    messagesEndRef
}: ChatMessageListProps) {
    if (!messages || messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary/40" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">No messages yet</p>
                <p className="text-sm max-w-xs text-center">Start a conversation to brainstorm ideas, outline your story, or get writing assistance.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 scroll-smooth">
            {messages.map((msg) => (
                <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    threadId={threadId}
                    onRegenerate={() => onRegenerateFrom(msg.timestamp)}
                />
            ))}
            {isLoading && (
                <div className="flex items-center gap-3 text-muted-foreground ml-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="flex gap-1">
                        <span className="animate-bounce delay-0">.</span>
                        <span className="animate-bounce delay-150">.</span>
                        <span className="animate-bounce delay-300">.</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
        </div>
    );
}
