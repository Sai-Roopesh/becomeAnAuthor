'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { DocumentNode } from '@/lib/config/types';

interface CreateNodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    parentId: string | null;
    type: 'act' | 'chapter' | 'scene';
}

export function CreateNodeDialog({ open, onOpenChange, projectId, parentId, type }: CreateNodeDialogProps) {
    const [title, setTitle] = useState('');
    const nodeRepo = useNodeRepository();

    const handleCreate = async () => {
        if (!title.trim()) return;

        // Use repository to get siblings
        const siblings = await nodeRepo.getByParent(projectId, parentId);
        const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order), 0);
        const newOrder = maxOrder + 100;

        // Use repository create method
        await nodeRepo.create({
            projectId,
            parentId,
            title,
            order: newOrder,
            type,
            ...(type === 'scene' ? {
                content: { type: 'doc', content: [] },
                summary: '',
                status: 'draft',
                wordCount: 0,
            } : {})
        });

        setTitle('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add {type.charAt(0).toUpperCase() + type.slice(1)}</DialogTitle>
                    <DialogDescription>
                        Enter a title for your new {type}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="col-span-3"
                            placeholder={`New ${type}`}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
