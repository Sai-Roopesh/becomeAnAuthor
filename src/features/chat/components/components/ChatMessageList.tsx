'use client';

import { ChatMessage as ChatMessageComponent } from '../chat-message';
import type { ChatMessage } from '@/lib/config/types';
import { RefObject } from 'react';

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
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>No messages yet. Start a conversation!</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
                <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    threadId={threadId}
                    onRegenerate={() => onRegenerateFrom(msg.timestamp)}
                />
            ))}
            {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    <span>Generating response...</span>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
