'use client';

import { DocumentNode } from '@/lib/config/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface MatrixViewProps {
    projectId: string;
    nodes: DocumentNode[];
    searchQuery: string;
}

type MatrixMode = 'codex' | 'pov' | 'labels';

export function MatrixView({ projectId, nodes, searchQuery }: MatrixViewProps) {
    const [mode, setMode] = useState<MatrixMode>('codex');
    const codexRepo = useCodexRepository();
    const codexEntries = useLiveQuery(() => codexRepo.getByProject(projectId), [projectId, codexRepo]);

    const acts = nodes.filter(n => n.type === 'act');
    const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);

    const getScenes = () => {
        const allScenes: DocumentNode[] = [];
        acts.forEach(act => {
            const chapters = getChildren(act.id);
            chapters.forEach(chapter => {
                const scenes = getChildren(chapter.id);
                scenes.forEach(scene => allScenes.push(scene));
            });
        });
        return allScenes;
    };

    const scenes = getScenes();

    if (scenes.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12">
                <p className="text-lg font-medium">No scenes yet</p>
                <p className="text-sm mt-2">Create scenes in the Grid or Outline view first.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-4">
                <Select value={mode} onValueChange={(v) => setMode(v as MatrixMode)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="codex">Codex Entries</SelectItem>
                        <SelectItem value="pov">Point of View</SelectItem>
                        <SelectItem value="labels">Labels</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Matrix Table */}
            <div className="border rounded-lg overflow-auto">
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                        <tr>
                            <th className="p-3 text-left font-semibold border-r min-w-[200px]">Scene</th>
                            {mode === 'codex' && codexEntries?.slice(0, 5).map(entry => (
                                <th key={entry.id} className="p-3 text-left font-medium border-r min-w-[120px]">
                                    {entry.name}
                                </th>
                            ))}
                            {mode === 'pov' && (
                                <th className="p-3 text-left font-medium border-r min-w-[150px]">POV Character</th>
                            )}
                            {mode === 'labels' && (
                                <th className="p-3 text-left font-medium border-r min-w-[150px]">Labels</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {scenes.map((scene, idx) => (
                            <tr key={scene.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                <td className="p-3 border-r font-medium">{scene.title}</td>
                                {mode === 'codex' && codexEntries?.slice(0, 5).map(entry => (
                                    <td key={entry.id} className="p-3 border-r text-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            defaultChecked={false}
                                        />
                                    </td>
                                ))}
                                {mode === 'pov' && (
                                    <td className="p-3 border-r">
                                        <span className="text-sm text-muted-foreground">
                                            {scene.type === 'scene' && 'pov' in scene && scene.pov ? scene.pov : '-'}
                                        </span>
                                    </td>
                                )}
                                {mode === 'labels' && (
                                    <td className="p-3 border-r">
                                        <div className="flex gap-1 flex-wrap">
                                            {scene.type === 'scene' && 'labels' in scene && scene.labels?.map(label => (
                                                <span key={label} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {mode === 'codex' && (!codexEntries || codexEntries.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No codex entries yet. Create some in the Codex tab first.</p>
                </div>
            )}
        </div>
    );
}
