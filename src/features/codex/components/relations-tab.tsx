'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { usePrompt } from '@/hooks/use-prompt';
import { Button } from '@/components/ui/button';
import { Plus, X, Link2 } from 'lucide-react';
import { toast } from '@/lib/toast-service';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { useRepository } from '@/hooks/use-repository';
import type { ICodexRelationRepository } from '@/domain/repositories/ICodexRelationRepository';

interface RelationsTabProps {
    entityId: string;
}

export function RelationsTab({ entityId }: RelationsTabProps) {
    const codexRepo = useCodexRepository();
    const relationRepo = useRepository<ICodexRelationRepository>('codexRelationRepository');

    const relations = useLiveQuery(
        () => relationRepo.getByParent(entityId),
        [entityId, relationRepo]
    );

    const relatedEntries = useLiveQuery(async () => {
        if (!relations) return [];
        const entries = [];
        for (const relation of relations) {
            const entry = await codexRepo.get(relation.childId);
            if (entry) entries.push(entry);
        }
        return entries;
    }, [relations, codexRepo]);

    const { prompt, PromptDialog } = usePrompt();

    const addRelation = async () => {
        const name = await prompt({
            title: 'Link Codex Entry',
            description: 'Enter the name of the codex entry to link:',
            placeholder: 'Entry name...'
        });

        if (!name) return;

        const entries = await codexRepo.getByProject(''); // This needs projectId - using workaround
        const entry = entries.find(e => e.name.toLowerCase() === name.toLowerCase());

        if (entry) {
            await relationRepo.create({
                parentId: entityId,
                childId: entry.id,
            });
            toast.success(`Linked to ${entry.name}`);
        } else {
            toast.error('Entry not found');
        }
    };

    const removeRelation = async (relationId: string) => {
        await relationRepo.delete(relationId);
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

            <PromptDialog />
        </div>
    );
}
