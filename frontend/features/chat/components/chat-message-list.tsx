'use client';

import { ChatMessage as ChatMessageComponent } from './chat-message';
import type { ChatMessage } from '@/domain/entities/types';
import { RefObject } from 'react';
import { Sparkles, Lightbulb, BookOpen, Pencil, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessageListProps {
    messages: ChatMessage[] | undefined;
    isLoading: boolean;
    threadId: string;
    onRegenerateFrom: (timestamp: number) => void;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    onSuggestionClick?: (suggestion: string) => void;
}

const QUICK_SUGGESTIONS = [
    { icon: Lightbulb, text: "Help me brainstorm character ideas", color: "text-amber-500" },
    { icon: BookOpen, text: "Outline my next chapter", color: "text-blue-500" },
    { icon: Pencil, text: "Describe this scene's setting", color: "text-green-500" },
    { icon: Users, text: "Develop my protagonist's backstory", color: "text-purple-500" },
];

/**
 * Chat Message List Component
 * Displays conversation messages with regeneration support
 */
export function ChatMessageList({
    messages,
    isLoading,
    threadId,
    onRegenerateFrom,
    messagesEndRef,
    onSuggestionClick
}: ChatMessageListProps) {
    if (!messages || messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary/40" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">No messages yet</p>
                <p className="text-sm max-w-xs text-center mb-6">
                    Start a conversation to brainstorm ideas, outline your story, or get writing assistance.
                </p>

                {/* Quick Suggestions */}
                {onSuggestionClick && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full px-4">
                        {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="justify-start text-left h-auto py-3 px-4 hover:bg-accent/50 transition-all w-full"
                                onClick={() => onSuggestionClick(suggestion.text)}
                            >
                                <suggestion.icon className={`h-4 w-4 mr-2.5 flex-shrink-0 ${suggestion.color}`} />
                                <span className="text-xs text-muted-foreground truncate">{suggestion.text}</span>
                            </Button>
                        ))}
                    </div>
                )}
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
            <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} className="h-4" /></div>
    );
}

