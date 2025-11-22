'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Plus, X, Link2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface RelationsTabProps {
    entityId: string;
}

export function RelationsTab({ entityId }: RelationsTabProps) {
    const relations = useLiveQuery(
        () => db.codexRelations.where('parentId').equals(entityId).toArray(),
        [entityId]
    );

    const relatedEntries = useLiveQuery(async () => {
        if (!relations) return [];
        const ids = relations.map(r => r.childId);
        return db.codex.where('id').anyOf(ids).toArray();
    }, [relations]);

    const allCodexEntries = useLiveQuery(() => db.codex.toArray());

    const addRelation = () => {
        if (!allCodexEntries) return;

        const name = prompt('Enter codex entry name to link:');
        if (!name) return;

        const entry = allCodexEntries.find(e =>
            e.name.toLowerCase().includes(name.toLowerCase())
        );

        if (entry) {
            db.codexRelations.add({
                id: uuidv4(),
                parentId: entityId,
                childId: entry.id,
                createdAt: Date.now(),
            });
        } else {
            alert('Entry not found');
        }
    };

    const removeRelation = async (relationId: string) => {
        await db.codexRelations.delete(relationId);
    };

    return (
        <div className="max-w-3xl space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-medium">Relations/Connections</h3>
                    <p className="text-sm text-muted-foreground">
                        Link related codex entries. Nested entries will be included in AI context when this entry is mentioned.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={addRelation}>
                    <Plus className="h-3 w-3 mr-1" /> Add Entry
                </Button>
            </div>

            {relatedEntries && relatedEntries.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Parent relations</h4>
                    {relatedEntries.map((entry) => {
                        const relation = relations?.find(r => r.childId === entry.id);
                        return (
                            <div key={entry.id} className="flex items-center gap-3 p-3 border rounded hover:bg-accent">
                                <div className="h-8 w-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                    <Link2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{entry.name}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{entry.category}</div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => relation && removeRelation(relation.id)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-sm text-muted-foreground text-center py-12 border rounded-lg">
                    No relations yet. Link related entries to group them together.
                </div>
            )}
        </div>
    );
}
