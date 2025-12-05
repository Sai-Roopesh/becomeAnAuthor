'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ChevronDown, ChevronUp, X } from 'lucide-react';

interface AIChatInputProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onCancel: () => void;
    showControls: boolean;
    onToggleControls: () => void;
    isGenerating: boolean;
    disabled?: boolean;
}

/**
 * Input row component for AI Chat with send/cancel buttons.
 * Extracted from AIChat for better maintainability.
 */
export function AIChatInput({
    input,
    onInputChange,
    onSend,
    onCancel,
    showControls,
    onToggleControls,
    isGenerating,
    disabled = false,
}: AIChatInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="p-4 flex gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={onToggleControls}
                className="flex-none"
                title={showControls ? 'Hide controls' : 'Show controls'}
            >
                {showControls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            <Input
                value={input}
                onChange={e => onInputChange(e.target.value)}
                placeholder="Ask any question..."
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={disabled}
            />

            {isGenerating ? (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCancel}
                    title="Cancel generation"
                >
                    <X className="h-4 w-4" />
                </Button>
            ) : (
                <Button
                    size="icon"
                    onClick={onSend}
                    disabled={!input.trim() || disabled}
                    title="Send message"
                >
                    <Send className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
