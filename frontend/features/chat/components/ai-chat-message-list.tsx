'use client';

import { ChatMessage } from '@/domain/entities/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIChatMessageListProps {
    messages: Array<Pick<ChatMessage, 'role' | 'content' | 'id' | 'model'>>;
    streamingMessageId: string | null;
    streamingContent: string;
    isGenerating: boolean;
}

/**
 * Renders the list of chat messages with streaming support.
 * Extracted from AIChat for better maintainability.
 */
export function AIChatMessageList({
    messages,
    streamingMessageId,
    streamingContent,
    isGenerating,
}: AIChatMessageListProps) {
    return (
        <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        <p className="text-lg font-medium mb-2">Start a conversation</p>
                        <p className="text-sm">Ask about your characters, plot, scenes, or anything else!</p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${m.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                            <p className="text-sm whitespace-pre-wrap">
                                {/* Show streaming content if this is the streaming message */}
                                {streamingMessageId === m.id && streamingContent
                                    ? streamingContent
                                    : m.content}
                                {/* Show cursor for streaming messages */}
                                {streamingMessageId === m.id && isGenerating && (
                                    <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse" />
                                )}
                            </p>
                            {m.model && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {m.model}
                                </p>
                            )}
                        </div>
                    </div>
                ))}

                {isGenerating && !streamingMessageId && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2">
                            <div className="text-sm text-muted-foreground">Thinking...</div>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
