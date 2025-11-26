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
import { db } from '@/lib/core/database';
import { v4 as uuidv4 } from 'uuid';
import { Sparkles, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DexieProjectRepository } from '@/infrastructure/repositories/DexieProjectRepository';

const TITLES = [
    "The Last Starship", "Whispers in the Dark", "The Clockwork Heart", "Echoes of Eternity",
    "The Silent Forest", "Beneath the Waves", "The Alchemist's Secret", "Shadows of the Past",
    "The Crimson Crown", "Beyond the Horizon", "The Forgotten City", "Starlight and Ash"
];

export function CreateProjectDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        language: 'English (US)',
        seriesName: '',
        seriesIndex: ''
    });

    const handleSurpriseMe = () => {
        const randomTitle = TITLES[Math.floor(Math.random() * TITLES.length)];
        setFormData(prev => ({ ...prev, title: randomTitle }));
    };

    const handleCreate = async () => {
        try {
            let seriesId = undefined;
            if (formData.seriesName) {
                // Check if series exists or create new
                const existingSeries = await db.series.where('title').equals(formData.seriesName).first();
                if (existingSeries) {
                    seriesId = existingSeries.id;
                } else {
                    seriesId = uuidv4();
                    await db.series.add({
                        id: seriesId,
                        title: formData.seriesName,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }
            }

            // ✅ Use repository - validation happens inside repository
            const projectRepo = new DexieProjectRepository();
            const project = await projectRepo.create({
                title: formData.title,
                author: formData.author,
                language: formData.language,
                seriesId: seriesId,
                seriesIndex: formData.seriesIndex,
            });

            // Create initial manuscript structure
            const actId = uuidv4();
            const chapterId = uuidv4();
            const sceneId = uuidv4();

            const now = Date.now();

            // Use existing node validation from schemas
            const { ActSchema, ChapterSchema, SceneSchema } = await import('@/lib/schemas');

            const validatedAct = ActSchema.parse({
                id: actId,
                projectId: project.id,
                type: 'act' as const,
                title: 'Act 1',
                order: 0,
                parentId: null,
                expanded: true,
                createdAt: now,
                updatedAt: now
            });

            const validatedChapter = ChapterSchema.parse({
                id: chapterId,
                projectId: project.id,
                type: 'chapter' as const,
                title: 'Chapter 1',
                order: 0,
                parentId: actId,
                expanded: true,
                createdAt: now,
                updatedAt: now
            });

            const validatedScene = SceneSchema.parse({
                id: sceneId,
                projectId: project.id,
                type: 'scene' as const,
                title: 'Scene 1',
                order: 0,
                parentId: chapterId,
                content: { type: 'doc', content: [] },
                expanded: false,
                createdAt: now,
                updatedAt: now,
                status: 'draft' as const,
                wordCount: 0,
                summary: ''
            });

            await db.nodes.bulkAdd([validatedAct, validatedChapter, validatedScene]);

            setOpen(false);
            setStep(1);
            setFormData({ title: '', author: '', language: 'English (US)', seriesName: '', seriesIndex: '' });
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
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Novel
                </Button>
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
                    <Button onClick={handleCreate} disabled={!formData.title}>Create Novel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
