'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { CodexEntry, CodexCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, User, MapPin, Book, Box, FileText, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { EntityEditor } from '@/components/codex/entity-editor';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/lib/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';

export function CodexList({ projectId }: { projectId: string }) {
    const [search, setSearch] = useState('');
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

    const entries = useLiveQuery(
        () => db.codex.where('projectId').equals(projectId).toArray()
    );

    const filteredEntries = entries?.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );

    const createEntry = async () => {
        const id = uuidv4();
        await db.codex.add({
            id,
            projectId,
            name: 'New Entity',
            category: 'character',
            aliases: [],
            description: '',
            attributes: {},
            tags: [],
            references: [],
            settings: { isGlobal: false, doNotTrack: false },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        setSelectedEntityId(id);
    };

    const { confirm, ConfirmationDialog } = useConfirmation();

    const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: 'Delete Entity',
            description: 'Are you sure you want to delete this entity? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
            await db.codex.delete(id);
            toast.success('Entity deleted');
            if (selectedEntityId === id) {
                setSelectedEntityId(null);
            }
        }
    };

    if (selectedEntityId) {
        return <EntityEditor entityId={selectedEntityId} onBack={() => setSelectedEntityId(null)} />;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Codex</h3>
                    <Button size="sm" onClick={createEntry}><Plus className="h-4 w-4" /></Button>
                </div>
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredEntries?.map(entry => (
                    <div
                        key={entry.id}
                        className="p-3 border rounded hover:bg-accent cursor-pointer flex items-center gap-3 group"
                        onClick={() => setSelectedEntityId(entry.id)}
                    >
                        <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                            {getIcon(entry.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{entry.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{entry.category}</div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleDeleteClick(entry.id, e)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
                {filteredEntries?.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        No entries found.
                    </div>
                )}
            </div>

            <ConfirmationDialog />
        </div>
    );
}

function getIcon(category: CodexCategory) {
    switch (category) {
        case 'character': return <User className="h-4 w-4" />;
        case 'location': return <MapPin className="h-4 w-4" />;
        case 'item': return <Box className="h-4 w-4" />;
        case 'lore': return <Book className="h-4 w-4" />;
        case 'subplot': return <FileText className="h-4 w-4" />;
    }
}
