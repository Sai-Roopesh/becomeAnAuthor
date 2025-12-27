'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Lightbulb, Sparkles, X } from 'lucide-react';

interface QuickCaptureModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** Open change handler */
    onOpenChange: (open: boolean) => void;
    /** Placeholder text for input */
    placeholder?: string;
    /** Title of the modal */
    title?: string;
    /** Icon to display */
    icon?: React.ReactNode;
    /** Submit handler */
    onSubmit: (value: string) => void;
    /** Optional suggestions to show */
    suggestions?: string[];
    /** Loading state */
    isSubmitting?: boolean;
}

/**
 * QuickCaptureModal - Quick input modal for capturing ideas, prompts, etc.
 * 
 * Similar to Cmd+K command palette but for input rather than search.
 * Designed for:
 * - Idea capture (⌘+I)
 * - Writing prompts (/spark)
 * - Quick notes
 * 
 * Features:
 * - Keyboard accessible (Escape to close, Cmd+Enter to submit)
 * - Auto-focus on open
 * - Optional suggestions
 * - Loading state for async submit
 * - Responsive: full width on mobile
 * 
 * @example
 * <QuickCaptureModal
 *   open={ideaModalOpen}
 *   onOpenChange={setIdeaModalOpen}
 *   title="Capture Idea"
 *   icon={<Lightbulb />}
 *   placeholder="What's your idea?"
 *   onSubmit={(text) => saveIdea(text)}
 *   suggestions={["Character development", "Plot twist", "Setting detail"]}
 * />
 */
export function QuickCaptureModal({
    open,
    onOpenChange,
    placeholder = "Type something...",
    title = "Quick Capture",
    icon,
    onSubmit,
    suggestions = [],
    isSubmitting = false,
}: QuickCaptureModalProps) {
    const [value, setValue] = useState('');

    // Reset value when modal opens
    useEffect(() => {
        if (open) {
            setValue('');
        }
    }, [open]);

    const handleSubmit = useCallback(() => {
        if (value.trim() && !isSubmitting) {
            onSubmit(value.trim());
            setValue('');
            onOpenChange(false);
        }
    }, [value, isSubmitting, onSubmit, onOpenChange]);

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setValue(prev => prev ? `${prev}\n${suggestion}` : suggestion);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-4 py-3 border-b border-border/50 bg-muted/20">
                    <DialogTitle className="flex items-center gap-2 text-base font-medium">
                        <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {icon || <Lightbulb className="h-4 w-4" />}
                        </span>
                        {title}
                    </DialogTitle>
                </DialogHeader>

                {/* Input area */}
                <div className="p-4">
                    <Textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={cn(
                            "min-h-24 max-h-[40vh] resize-none",
                            "border-0 focus-visible:ring-0 bg-transparent",
                            "text-base placeholder:text-muted-foreground/50"
                        )}
                        autoFocus
                    />
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && !value && (
                    <div className="px-4 pb-4">
                        <p className="text-xs text-muted-foreground mb-2">Suggestions</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs rounded-full",
                                        "bg-muted/50 hover:bg-muted",
                                        "text-muted-foreground hover:text-foreground",
                                        "transition-colors"
                                    )}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border/50 bg-muted/10 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                            ⌘+Enter
                        </kbd>
                        <span className="ml-1.5">to save</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={!value.trim() || isSubmitting}
                            className="min-w-20"
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Hook to open QuickCaptureModal with keyboard shortcut
 * 
 * @example
 * const { isOpen, open, close, toggle } = useQuickCapture('i'); // ⌘+I
 */
export function useQuickCapture(key: string) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key.toLowerCase()) {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [key]);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
        setIsOpen,
    };
}
