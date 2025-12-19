"use client";
import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PromptOptions {
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | null; // Return error message or null if valid
    allowEmpty?: boolean; // Default: false
    preserveWhitespace?: boolean; // Default: false (trims whitespace)
}

interface PromptState {
    isOpen: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    inputValue: string;
    errorMessage: string | null;
    validate?: (value: string) => string | null;
    allowEmpty: boolean;
    preserveWhitespace: boolean;
}

interface QueueItem {
    id: string;
    options: PromptOptions;
    resolve: (value: string | null) => void;
}

export function usePrompt() {
    const [state, setState] = useState<PromptState>({
        isOpen: false,
        title: '',
        description: '',
        placeholder: '',
        inputValue: '',
        errorMessage: null,
        allowEmpty: false,
        preserveWhitespace: false,
    });

    // Queue for managing multiple concurrent prompt requests
    const queueRef = useRef<QueueItem[]>([]);
    const activeItemRef = useRef<QueueItem | null>(null);
    const isMountedRef = useRef(true);

    // Lifecycle cleanup - mark component as unmounted
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // CRITICAL: Preserve user input on unmount!
            // Instead of rejecting, resolve with current input value
            // This ensures user doesn't lose what they typed
            if (activeItemRef.current && state.inputValue) {
                // User typed something - preserve it
                const finalValue = state.preserveWhitespace
                    ? state.inputValue
                    : state.inputValue.trim();
                activeItemRef.current.resolve(finalValue || null);
                activeItemRef.current = null;
            } else if (activeItemRef.current) {
                // No input - resolve as cancelled
                activeItemRef.current.resolve(null);
                activeItemRef.current = null;
            }
            // Clear queue - resolve all as cancelled (no user input to preserve)
            queueRef.current.forEach(item => item.resolve(null));
            queueRef.current = [];
        };
    }, [state.inputValue, state.preserveWhitespace]);

    const processNextInQueue = useCallback(() => {
        if (!isMountedRef.current) return;

        if (queueRef.current.length > 0) {
            const nextItem = queueRef.current.shift()!;
            activeItemRef.current = nextItem;

            setState({
                isOpen: true,
                title: nextItem.options.title,
                ...(nextItem.options.description && { description: nextItem.options.description }),
                ...(nextItem.options.placeholder && { placeholder: nextItem.options.placeholder }),
                inputValue: nextItem.options.defaultValue || '',
                errorMessage: null,
                ...(nextItem.options.validate && { validate: nextItem.options.validate }),
                allowEmpty: nextItem.options.allowEmpty ?? false,
                preserveWhitespace: nextItem.options.preserveWhitespace ?? false,
            });
        } else {
            activeItemRef.current = null;
        }
    }, []);

    const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            const item: QueueItem = {
                id: crypto.randomUUID(),
                options,
                resolve,
            };

            // If no dialog is currently active, show immediately
            if (!activeItemRef.current) {
                activeItemRef.current = item;
                setState({
                    isOpen: true,
                    title: options.title,
                    ...(options.description && { description: options.description }),
                    ...(options.placeholder && { placeholder: options.placeholder }),
                    inputValue: options.defaultValue || '',
                    errorMessage: null,
                    ...(options.validate && { validate: options.validate }),
                    allowEmpty: options.allowEmpty ?? false,
                    preserveWhitespace: options.preserveWhitespace ?? false,
                });
            } else {
                // Queue it for later
                queueRef.current.push(item);
            }
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (!activeItemRef.current) return;

        const processedValue = state.preserveWhitespace
            ? state.inputValue
            : state.inputValue.trim();

        // Validate if validator is provided
        if (state.validate) {
            const error = state.validate(processedValue);
            if (error) {
                setState(prev => ({ ...prev, errorMessage: error }));
                return; // Don't close dialog, show error
            }
        }

        // Check if empty and not allowed
        if (!processedValue && !state.allowEmpty) {
            setState(prev => ({ ...prev, errorMessage: 'This field is required' }));
            return;
        }

        // All good - resolve and close
        activeItemRef.current.resolve(processedValue || null);
        activeItemRef.current = null;
        setState(prev => ({ ...prev, isOpen: false, errorMessage: null }));
        // Queue processing happens in onOpenChange when dialog fully closes
    }, [state.inputValue, state.validate, state.allowEmpty, state.preserveWhitespace]);

    const handleCancel = useCallback(() => {
        if (activeItemRef.current) {
            activeItemRef.current.resolve(null);
            activeItemRef.current = null;
        }
        setState(prev => ({ ...prev, isOpen: false, inputValue: '', errorMessage: null }));
        // Queue processing happens in onOpenChange when dialog fully closes
    }, []);

    const handleInputChange = useCallback((value: string) => {
        setState(prev => ({ ...prev, inputValue: value, errorMessage: null }));
    }, []);

    const PromptDialog = useCallback(() => (
        <Dialog
            open={state.isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    handleCancel();
                    // Process next in queue after dialog animation completes
                    processNextInQueue();
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{state.title}</DialogTitle>
                    {state.description && (
                        <DialogDescription>{state.description}</DialogDescription>
                    )}
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Input
                        value={state.inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={state.placeholder}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleConfirm();
                            } else if (e.key === 'Escape') {
                                handleCancel();
                            }
                        }}
                        autoFocus
                        className={state.errorMessage ? 'border-destructive' : ''}
                    />
                    {state.errorMessage && (
                        <p className="text-sm text-destructive">{state.errorMessage}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ), [state, handleConfirm, handleCancel, handleInputChange]);

    return { prompt, PromptDialog };
}
