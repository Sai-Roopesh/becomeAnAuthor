'use client';

import React from 'react';
import { useSeriesRepository } from '@/hooks/use-series-repository';
import { invalidateQueries } from '@/hooks/use-live-query';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from '@/shared/utils/toast-service';

interface CreateSeriesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (seriesId: string) => void;
}

export function CreateSeriesDialog({ open, onOpenChange, onCreated }: CreateSeriesDialogProps) {
    const seriesRepo = useSeriesRepository();
    const [title, setTitle] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleCreate = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setError('Series title is required');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            const seriesId = await seriesRepo.create({ title: trimmedTitle });
            toast.success(`Series "${trimmedTitle}" created`);
            invalidateQueries();
            setTitle('');
            onOpenChange(false);
            onCreated?.(seriesId);
        } catch (err: unknown) {
            // Handle duplicate title error from backend
            const message = err instanceof Error ? err.message : 'Failed to create series';
            if (message.toLowerCase().includes('already exists')) {
                setError(`A series named "${trimmedTitle}" already exists`);
            } else {
                setError(message);
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isCreating) {
            handleCreate();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Series</DialogTitle>
                    <DialogDescription>
                        Group related books together in a series (e.g., trilogies, sagas).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="series-title">Series Title</Label>
                        <Input
                            id="series-title"
                            placeholder="e.g., The Lord of the Rings"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating || !title.trim()}>
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : 'Create Series'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
