'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Sparkles, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { useSeriesRepository } from '@/hooks/use-series-repository';
import { useLiveQuery, invalidateQueries } from '@/hooks/use-live-query';
import { toast } from 'sonner';
import type { Series } from '@/domain/entities/types';

const TITLES = [
    "The Last Starship", "Whispers in the Dark", "The Clockwork Heart", "Echoes of Eternity",
    "The Silent Forest", "Beneath the Waves", "The Alchemist's Secret", "Shadows of the Past",
    "The Crimson Crown", "Beyond the Horizon", "The Forgotten City", "Starlight and Ash"
];

interface CreateProjectDialogProps {
    trigger?: React.ReactNode;
}

/**
 * CreateProjectDialog - Series-First Architecture
 * 
 * CRITICAL: Every project MUST belong to a series. This is a core architectural requirement.
 * Users must either:
 * 1. Select an existing series, OR
 * 2. Create a new series inline
 * 
 * The "Create Novel" button is DISABLED until a series is selected.
 */
export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const { projectRepository: projectRepo, nodeRepository: nodeRepo } = useAppServices();
    const seriesRepo = useSeriesRepository();

    // Fetch existing series for the dropdown
    const existingSeries = useLiveQuery(
        () => seriesRepo.list(),
        [seriesRepo]
    );

    const [formData, setFormData] = useState({
        title: '',
        author: '',
        language: 'English (US)',
        seriesId: '',           // REQUIRED - must select a series
        seriesIndex: 'Book 1',  // REQUIRED - default to "Book 1"
        savePath: ''            // REQUIRED - user must choose location
    });

    // State for inline series creation
    const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
    const [newSeriesName, setNewSeriesName] = useState('');

    // Auto-suggest next book number when series is selected
    useEffect(() => {
        if (formData.seriesId && existingSeries) {
            // Count existing projects in this series to suggest next book number
            // For now, just default to "Book 1" - in production, query project count
            // This could be enhanced to auto-calculate
        }
    }, [formData.seriesId, existingSeries]);

    const handleChooseLocation = async () => {
        try {
            const { showOpenDialog } = await import('@/core/tauri/commands');
            const selected = await showOpenDialog({
                directory: true,
                title: 'Choose where to save your novel'
            });

            if (selected && typeof selected === 'string') {
                setFormData(prev => ({ ...prev, savePath: selected }));
            }
        } catch (error) {
            console.error('Failed to open directory picker:', error);
            toast.error('Failed to open directory picker');
        }
    };

    const handleSurpriseMe = () => {
        const randomTitle = TITLES[Math.floor(Math.random() * TITLES.length)];
        setFormData(prev => ({ ...prev, ...(randomTitle && { title: randomTitle }) }));
    };

    const handleCreateNewSeries = async () => {
        if (!newSeriesName.trim()) {
            toast.error('Please enter a series name');
            return;
        }

        try {
            // Check if series already exists
            const existing = await seriesRepo.getByName(newSeriesName.trim());
            if (existing) {
                setFormData(prev => ({ ...prev, seriesId: existing.id }));
                setIsCreatingNewSeries(false);
                setNewSeriesName('');
                return;
            }

            // Create new series
            const newSeriesId = await seriesRepo.create({
                title: newSeriesName.trim()
            });

            // Invalidate queries to refresh series list
            invalidateQueries();

            // Select the new series
            setFormData(prev => ({ ...prev, seriesId: newSeriesId }));
            setIsCreatingNewSeries(false);
            setNewSeriesName('');
        } catch (error) {
            console.error('Failed to create series:', error);
            toast.error('Failed to create series');
        }
    };

    const handleCreate = async () => {
        // Validate all required fields
        if (!formData.seriesId) {
            toast.error('Please select a series. Every book must belong to a series.');
            return;
        }
        if (!formData.seriesIndex.trim()) {
            toast.error('Please enter the book number (e.g., "Book 1")');
            return;
        }
        if (!formData.savePath) {
            toast.error('Please choose a save location for your project');
            return;
        }
        if (!formData.title.trim()) {
            toast.error('Please enter a title for your novel');
            return;
        }

        try {
            // ✅ Create project with REQUIRED seriesId and seriesIndex
            const projectId = await projectRepo.create({
                title: formData.title,
                author: formData.author,
                language: formData.language,
                seriesId: formData.seriesId,       // REQUIRED
                seriesIndex: formData.seriesIndex, // REQUIRED
                customPath: formData.savePath,
            } as any); // Type assertion needed since customPath not in base Project type

            // Create initial manuscript structure using repository
            const act = await nodeRepo.create({
                projectId: projectId,
                type: 'act',
                title: 'Act 1',
                order: 0,
                parentId: null,
                expanded: true,
            });

            const chapter = await nodeRepo.create({
                projectId: projectId,
                type: 'chapter',
                title: 'Chapter 1',
                order: 0,
                parentId: act.id,
                expanded: true,
            });

            await nodeRepo.create({
                projectId: projectId,
                type: 'scene',
                title: 'Scene 1',
                order: 0,
                parentId: chapter.id,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: ''
            });

            // Invalidate project list cache so new project appears
            invalidateQueries();

            toast.success(`Created "${formData.title}"`);

            // Navigate to the new project
            window.location.href = `/project?id=${projectId}`;

            setOpen(false);
            setFormData({ title: '', author: '', language: 'English (US)', seriesId: '', seriesIndex: 'Book 1', savePath: '' });
        } catch (error) {
            console.error('Failed to create project:', error);
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Failed to create project: ${message}`);
        }
    };

    // Form validation - all required fields must be filled
    const isFormValid = formData.title.trim() && formData.seriesId && formData.seriesIndex.trim() && formData.savePath;

    // Get selected series name for display
    const selectedSeries = existingSeries?.find(s => s.id === formData.seriesId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Novel
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create a new Novel</DialogTitle>
                    <DialogDescription>
                        Let's get you started with your next masterpiece.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* SERIES SELECTION - REQUIRED */}
                    <div className="space-y-2 p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <Label className="font-semibold">Series *</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                            Every book belongs to a series. Choose an existing series or create a new one.
                        </p>

                        {!isCreatingNewSeries ? (
                            <div className="space-y-2">
                                <Select
                                    value={formData.seriesId}
                                    onValueChange={val => setFormData({ ...formData, seriesId: val })}
                                >
                                    <SelectTrigger className={!formData.seriesId ? 'border-destructive/50' : ''}>
                                        <SelectValue placeholder="Select a series..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {existingSeries?.map(series => (
                                            <SelectItem key={series.id} value={series.id}>
                                                {series.title}
                                            </SelectItem>
                                        ))}
                                        {(!existingSeries || existingSeries.length === 0) && (
                                            <SelectItem value="_none" disabled>
                                                No series yet - create one below
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setIsCreatingNewSeries(true)}
                                >
                                    <Plus className="mr-2 h-3 w-3" /> Create New Series
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={newSeriesName}
                                        onChange={e => setNewSeriesName(e.target.value)}
                                        placeholder="Enter series name..."
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleCreateNewSeries}
                                        disabled={!newSeriesName.trim()}
                                    >
                                        Create
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsCreatingNewSeries(false);
                                        setNewSeriesName('');
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Book Number */}
                    <div className="space-y-2">
                        <Label>Book Number *</Label>
                        <Input
                            value={formData.seriesIndex}
                            onChange={e => setFormData({ ...formData, seriesIndex: e.target.value })}
                            placeholder="e.g. Book 1, Book 2"
                        />
                        <p className="text-xs text-muted-foreground">
                            Position in the series (e.g., "Book 1", "Book 2", "Prequel")
                        </p>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label>Title *</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="My Awesome Novel"
                            />
                            <Button variant="outline" onClick={handleSurpriseMe} title="Surprise Me">
                                <Sparkles className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Author */}
                    <div className="space-y-2">
                        <Label>Author / Pen Name</Label>
                        <Input
                            value={formData.author}
                            onChange={e => setFormData({ ...formData, author: e.target.value })}
                            placeholder="e.g. J.K. Rowling"
                        />
                    </div>

                    {/* Save Location */}
                    <div className="space-y-2">
                        <Label>Save Location *</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.savePath}
                                readOnly
                                placeholder="Click 'Choose Folder' to select location"
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleChooseLocation}
                                className="shrink-0"
                            >
                                📁 Choose Folder
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Your project will be saved in a folder named after your title at this location.
                        </p>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                        <Label>Language</Label>
                        <Select value={formData.language} onValueChange={val => setFormData({ ...formData, language: val })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="English (US)">English (US)</SelectItem>
                                <SelectItem value="English (UK)">English (UK)</SelectItem>
                                <SelectItem value="Spanish">Spanish</SelectItem>
                                <SelectItem value="French">French</SelectItem>
                                <SelectItem value="German">German</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Used for AI generation and spellcheck.</p>
                    </div>

                    {/* Validation Warning */}
                    {!formData.seriesId && (
                        <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Please select or create a series to continue</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleCreate}
                        disabled={!isFormValid}
                    >
                        Create Novel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
