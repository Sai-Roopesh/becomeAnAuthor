'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { CodexEntry, CodexCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, User, MapPin, Book, Box, FileText } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { EntityEditor } from '@/components/codex/entity-editor';

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
                        className="p-3 border rounded hover:bg-accent cursor-pointer flex items-center gap-3"
                        onClick={() => setSelectedEntityId(entry.id)}
                    >
                        <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                            {getIcon(entry.category)}
                        </div>
                        <div>
                            <div className="font-medium text-sm">{entry.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{entry.category}</div>
                        </div>
                    </div>
                ))}
                {filteredEntries?.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        No entries found.
                    </div>
                )}
            </div>
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
