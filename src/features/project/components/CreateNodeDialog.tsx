'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { db } from '@/lib/core/database';
import { v4 as uuidv4 } from 'uuid';
import { DocumentNode } from '@/lib/config/types';
import { useNodeRepository } from '@/hooks/use-node-repository';

interface CreateNodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    parentId: string | null;
    type: 'act' | 'chapter' | 'scene';
}

export function CreateNodeDialog({ open, onOpenChange, projectId, parentId, type }: CreateNodeDialogProps) {
    const nodeRepo = useNodeRepository();
    const [title, setTitle] = useState('');

    const handleCreate = async () => {
        if (!title.trim()) return;

        // Find last order in siblings
        const siblings = await db.nodes
            .where('projectId').equals(projectId)
            .filter(n => n.parentId === parentId)
            .toArray();

        const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order), 0);
        const newOrder = maxOrder + 100;

        // Use repository to create node
        await nodeRepo.create({
            projectId,
            parentId,
            type,
            title,
            order: newOrder,
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
