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
import { db } from '@/lib/db';
import { Settings, Trash2, Archive, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLiveQuery } from 'dexie-react-hooks';

export function ProjectSettingsDialog({ projectId }: { projectId: string }) {
    const [open, setOpen] = useState(false);
    const project = useLiveQuery(() => db.projects.get(projectId), [projectId]);

    const [formData, setFormData] = useState({
        title: '',
        author: '',
        language: 'English (US)',
        coverImage: ''
    });

    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title,
                author: project.author || '',
                language: project.language || 'English (US)',
                coverImage: project.coverImage || ''
            });
        }
    }, [project, open]);

    const handleSave = async () => {
        if (!project) return;
        await db.projects.update(projectId, {
            title: formData.title,
            author: formData.author,
            language: formData.language,
            coverImage: formData.coverImage,
            updatedAt: Date.now()
        });
        setOpen(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, coverImage: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleArchive = async () => {
        if (confirm('Are you sure you want to archive this novel?')) {
            await db.projects.update(projectId, { archived: true });
            setOpen(false);
            // Redirect or refresh might be needed if on project page
            window.location.href = '/';
        }
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to DELETE this novel? This cannot be undone.')) {
            await db.projects.delete(projectId);
            await db.nodes.where('projectId').equals(projectId).delete();
            await db.codex.where('projectId').equals(projectId).delete();
            setOpen(false);
            window.location.href = '/';
        }
    };

    if (!project) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Novel Settings</DialogTitle>
                    <DialogDescription>
                        Manage metadata, cover image, and danger zone.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Author</Label>
                            <Input
                                value={formData.author}
                                onChange={e => setFormData({ ...formData, author: e.target.value })}
                            />
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
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Cover Image</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center h-[200px] relative overflow-hidden bg-muted/50">
                            {formData.coverImage ? (
                                <img src={formData.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Upload className="h-8 w-8 mx-auto mb-2" />
                                    <span className="text-xs">Upload Cover (1.6:1)</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleImageUpload}
                            />
                        </div>
                        {formData.coverImage && (
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setFormData({ ...formData, coverImage: '' })}>
                                Remove Cover
                            </Button>
                        )}
                    </div>
                </div>

                <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleArchive}>
                            <Archive className="h-4 w-4 mr-2" /> Archive Novel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Forever
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
