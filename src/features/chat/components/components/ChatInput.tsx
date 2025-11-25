'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled: boolean;
    placeholder?: string;
}

/**
 * Chat Input Component
 * Handles user message input and send action
 */
export function ChatInput({
    value,
    onChange,
    onSend,
    disabled,
    placeholder = 'Type your message...'
}: ChatInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Send on Ctrl/Cmd + Enter
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="border-t p-4 bg-background">
            <div className="flex gap-2">
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="min-h-[80px] resize-none"
                />
                <Button
                    onClick={onSend}
                    disabled={disabled || !value.trim()}
                    size="icon"
                    className="shrink-0"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                Press Ctrl/Cmd + Enter to send
            </p>
        </div>
    );
}
