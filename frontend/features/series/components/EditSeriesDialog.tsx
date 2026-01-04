'use client';

import React from 'react';
import type { Series } from '@/domain/entities/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/shared/utils/toast-service';

interface EditSeriesDialogProps {
    series: Series;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
    { value: 'planned', label: 'Planned' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
];

const GENRE_OPTIONS = [
    'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
    'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
    'Children', 'Non-Fiction', 'Biography', 'Other'
];

export function EditSeriesDialog({ series, open, onOpenChange }: EditSeriesDialogProps) {
    const seriesRepo = useSeriesRepository();
    const [isSaving, setIsSaving] = React.useState(false);
    const [formData, setFormData] = React.useState<{
        title: string;
        description: string;
        author: string;
        genre: string;
        status: NonNullable<Series['status']>;
    }>({
        title: series.title,
        description: series.description || '',
        author: series.author || '',
        genre: series.genre || '',
        status: series.status || 'planned',
    });

    // Reset form when series changes
    React.useEffect(() => {
        setFormData({
            title: series.title,
            description: series.description || '',
            author: series.author || '',
            genre: series.genre || '',
            status: series.status || 'planned',
        });
    }, [series]);

    const handleSave = async () => {
        const trimmedTitle = formData.title.trim();
        if (!trimmedTitle) {
            toast.error('Series title is required');
            return;
        }

        setIsSaving(true);
        try {
            const updates: Partial<Series> = { title: trimmedTitle };
            if (formData.description) updates.description = formData.description;
            if (formData.author) updates.author = formData.author;
            if (formData.genre) updates.genre = formData.genre;
            if (formData.status) updates.status = formData.status;

            await seriesRepo.update(series.id, updates);
            toast.success('Series updated');
            invalidateQueries();
            onOpenChange(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update series';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Series</DialogTitle>
                    <DialogDescription>
                        Update series details and metadata.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="series-title">Title *</Label>
                        <Input
                            id="series-title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Series title"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="series-description">Description</Label>
                        <Textarea
                            id="series-description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the series..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="series-author">Author</Label>
                            <Input
                                id="series-author"
                                value={formData.author}
                                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                                placeholder="Author name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="series-status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val as NonNullable<Series['status']> }))}
                            >

                                <SelectTrigger id="series-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="series-genre">Genre</Label>
                        <Select
                            value={formData.genre}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, genre: val }))}
                        >
                            <SelectTrigger id="series-genre">
                                <SelectValue placeholder="Select genre" />
                            </SelectTrigger>
                            <SelectContent>
                                {GENRE_OPTIONS.map(genre => (
                                    <SelectItem key={genre} value={genre}>
                                        {genre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !formData.title.trim()}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
