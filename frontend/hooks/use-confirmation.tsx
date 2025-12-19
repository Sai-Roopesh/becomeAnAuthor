"use client";
import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
}

interface ConfirmationState extends ConfirmationOptions {
    isOpen: boolean;
}

interface QueueItem {
    id: string;
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
}

export function useConfirmation() {
    const [state, setState] = useState<ConfirmationState>({
        isOpen: false,
        title: '',
        description: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'default',
    });

    // Queue for managing multiple concurrent confirmation requests
    const queueRef = useRef<QueueItem[]>([]);
    const activeItemRef = useRef<QueueItem | null>(null);
    const isMountedRef = useRef(true);

    // Lifecycle cleanup - mark component as unmounted
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // SAFE CLEANUP: Auto-cancel any pending confirmations on unmount
            // This prevents memory leaks while defaulting to "cancel" (safe choice)
            if (activeItemRef.current) {
                activeItemRef.current.resolve(false);
                activeItemRef.current = null;
            }
            // Clear queue and resolve all as cancelled
            queueRef.current.forEach(item => item.resolve(false));
            queueRef.current = [];
        };
    }, []);

    const processNextInQueue = useCallback(() => {
        if (!isMountedRef.current) return;

        if (queueRef.current.length > 0) {
            const nextItem = queueRef.current.shift()!;
            activeItemRef.current = nextItem;

            setState({
                isOpen: true,
                title: nextItem.options.title,
                description: nextItem.options.description,
                confirmText: nextItem.options.confirmText || 'Confirm',
                cancelText: nextItem.options.cancelText || 'Cancel',
                variant: nextItem.options.variant || 'default',
            });
        } else {
            activeItemRef.current = null;
        }
    }, []);

    const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
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
                    description: options.description,
                    confirmText: options.confirmText || 'Confirm',
                    cancelText: options.cancelText || 'Cancel',
                    variant: options.variant || 'default',
                });
            } else {
                // Queue it for later
                queueRef.current.push(item);
            }
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (activeItemRef.current) {
            activeItemRef.current.resolve(true);
            activeItemRef.current = null;
        }
        setState(prev => ({ ...prev, isOpen: false }));
        // Queue processing happens in onOpenChange when dialog fully closes
    }, []);

    const handleCancel = useCallback(() => {
        if (activeItemRef.current) {
            activeItemRef.current.resolve(false);
            activeItemRef.current = null;
        }
        setState(prev => ({ ...prev, isOpen: false }));
        // Queue processing happens in onOpenChange when dialog fully closes
    }, []);

    const ConfirmationDialog = useCallback(() => (
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
                    <DialogDescription>{state.description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        {state.cancelText}
                    </Button>
                    <Button
                        variant={state.variant}
                        onClick={handleConfirm}
                    >
                        {state.confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ), [state, handleConfirm, handleCancel]);

    return { confirm, ConfirmationDialog };
}
