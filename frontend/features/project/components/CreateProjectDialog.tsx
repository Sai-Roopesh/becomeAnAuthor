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
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Sparkles, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectRepository } from '@/hooks/use-project-repository';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { useSeriesRepository } from '@/hooks/use-series-repository';

const TITLES = [
    "The Last Starship", "Whispers in the Dark", "The Clockwork Heart", "Echoes of Eternity",
    "The Silent Forest", "Beneath the Waves", "The Alchemist's Secret", "Shadows of the Past",
    "The Crimson Crown", "Beyond the Horizon", "The Forgotten City", "Starlight and Ash"
];

interface CreateProjectDialogProps {
    trigger?: React.ReactNode;
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const projectRepo = useProjectRepository();
    const nodeRepo = useNodeRepository();
    const seriesRepo = useSeriesRepository();
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        language: 'English (US)',
        seriesName: '',
        seriesIndex: '',
        savePath: '' // REQUIRED - user must choose
    });

    const handleChooseLocation = async () => {
        try {
            const { showOpenDialog } = await import('@/lib/tauri/commands');
            const selected = await showOpenDialog({
                directory: true,
                title: 'Choose where to save your novel'
            });

            if (selected && typeof selected === 'string') {
                setFormData(prev => ({ ...prev, savePath: selected }));
            }
        } catch (error) {
            console.error('Failed to open directory picker:', error);
            alert('Failed to open directory picker');
        }
    };

    const handleSurpriseMe = () => {
        const randomTitle = TITLES[Math.floor(Math.random() * TITLES.length)];
        setFormData(prev => ({ ...prev, title: randomTitle }));
    };

    const handleCreate = async () => {
        // Validate required location
        if (!formData.savePath) {
            alert('Please choose a save location for your project');
            return;
        }

        try {
            // ✅ Handle series - create or find existing
            let seriesId: string | undefined = undefined;

            if (formData.seriesName.trim()) {
                // Check if series already exists
                const existingSeries = await seriesRepo.getByName(formData.seriesName.trim());

                if (existingSeries) {
                    seriesId = existingSeries.id;
                } else {
                    // Create new series
                    seriesId = await seriesRepo.create({
                        title: formData.seriesName.trim()
                    });
                }
            }

            // ✅ Use repository with REQUIRED custom path
            const projectId = await projectRepo.create({
                title: formData.title,
                author: formData.author,
                language: formData.language,
                seriesId,
                seriesIndex: formData.seriesIndex,
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
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();

            // Navigate to the new project
            window.location.href = `/project?id=${projectId}`;

            setOpen(false);
            setStep(1);
            setFormData({ title: '', author: '', language: 'English (US)', seriesName: '', seriesIndex: '', savePath: '' });
        } catch (error) {
            console.error('Failed to create project:', error);
            // ✅ Show user-friendly error
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            alert(`Failed to create project: ${message}`);
        }
    };

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
                    <div className="space-y-2">
                        <Label>Title</Label>
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

                    <div className="space-y-2">
                        <Label>Author / Pen Name</Label>
                        <Input
                            value={formData.author}
                            onChange={e => setFormData({ ...formData, author: e.target.value })}
                            placeholder="e.g. J.K. Rowling"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Series (Optional)</Label>
                            <Input
                                value={formData.seriesName}
                                onChange={e => setFormData({ ...formData, seriesName: e.target.value })}
                                placeholder="Series Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Series Index</Label>
                            <Input
                                value={formData.seriesIndex}
                                onChange={e => setFormData({ ...formData, seriesIndex: e.target.value })}
                                placeholder="e.g. Book 1"
                            />
                        </div>
                    </div>

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
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleCreate}
                        disabled={!formData.title || !formData.savePath}
                    >
                        Create Novel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
