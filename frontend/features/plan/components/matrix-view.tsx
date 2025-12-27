'use client';

import { DocumentNode } from '@/domain/entities/types';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface MatrixViewProps {
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    nodes: DocumentNode[];
    searchQuery: string;
}

type MatrixMode = 'codex' | 'pov' | 'labels';

export function MatrixView({ projectId, seriesId, nodes, searchQuery }: MatrixViewProps) {
    const [mode, setMode] = useState<MatrixMode>('codex');
    const codexRepo = useCodexRepository();
    const codexEntries = useLiveQuery(() => codexRepo.getBySeries(seriesId), [seriesId, codexRepo]);

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

    const filterScenes = (scene: DocumentNode) => {
        if (!searchQuery) return true;
        return scene.title.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const filteredScenes = scenes.filter(filterScenes);

    if (scenes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative bg-background p-6 rounded-full shadow-xl border border-border/50">
                        <Table className="h-12 w-12 text-primary" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-heading font-bold">Story Matrix</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Visualize your story's connections. Create scenes to populate the matrix.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm border border-border/50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground px-2">Matrix Mode:</span>
                    <Select value={mode} onValueChange={(v) => setMode(v as MatrixMode)}>
                        <SelectTrigger className="w-[200px] bg-background border-border/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="codex">Codex Entries</SelectItem>
                            <SelectItem value="pov">Point of View</SelectItem>
                            <SelectItem value="labels">Labels</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-xs text-muted-foreground px-2">
                    {filteredScenes.length} Scenes
                </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-card/30 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border/50">
                            <tr>
                                <th className="p-4 text-left font-heading font-semibold text-foreground border-r border-border/50 min-w-[250px] sticky left-0 bg-muted/95 backdrop-blur z-10">
                                    Scene
                                </th>
                                {mode === 'codex' && codexEntries?.slice(0, 8).map(entry => (
                                    <th key={entry.id} className="p-4 text-center font-medium text-muted-foreground border-r border-border/50 min-w-[100px] whitespace-nowrap">
                                        {entry.name}
                                    </th>
                                ))}
                                {mode === 'pov' && (
                                    <th className="p-4 text-left font-medium text-muted-foreground border-r border-border/50 min-w-[200px]">POV Character</th>
                                )}
                                {mode === 'labels' && (
                                    <th className="p-4 text-left font-medium text-muted-foreground border-r border-border/50 min-w-[300px]">Labels</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredScenes.map((scene, idx) => (
                                <tr
                                    key={scene.id}
                                    className="group hover:bg-muted/30 transition-colors"
                                >
                                    <td className="p-4 border-r border-border/50 font-medium text-foreground sticky left-0 bg-background/95 group-hover:bg-muted/95 transition-colors backdrop-blur z-10">
                                        {scene.title}
                                    </td>
                                    {mode === 'codex' && codexEntries?.slice(0, 8).map(entry => (
                                        <td key={entry.id} className="p-4 border-r border-border/50 text-center">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                                defaultChecked={false}
                                            />
                                        </td>
                                    ))}
                                    {mode === 'pov' && (
                                        <td className="p-4 border-r border-border/50">
                                            {scene.type === 'scene' && 'pov' in scene && scene.pov ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                    {scene.pov}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/50 italic">None</span>
                                            )}
                                        </td>
                                    )}
                                    {mode === 'labels' && (
                                        <td className="p-4 border-r border-border/50">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {scene.type === 'scene' && 'labels' in scene && scene.labels && scene.labels.length > 0 ? (
                                                    scene.labels.map(label => (
                                                        <span key={label} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-md border border-border/50">
                                                            {label}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground/50 italic text-xs">No labels</span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {mode === 'codex' && (!codexEntries || codexEntries.length === 0) && (
                <div className="text-center p-8 border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
                    <p className="text-muted-foreground mb-2">No codex entries found</p>
                    <p className="text-xs text-muted-foreground/70">Create characters and locations in the Codex to track them here.</p>
                </div>
            )}
        </div>
    );
}
