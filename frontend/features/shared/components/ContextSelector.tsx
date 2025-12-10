'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Plus, FileText, BookOpen, X, Layers, Hash, File, Book, User, MapPin, Box, Scroll, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Act, Chapter, Scene, CodexEntry, CodexCategory } from '@/lib/config/types';
import { useAppServices } from '@/infrastructure/di/AppContext';

export interface ContextItem {
    type: 'novel' | 'outline' | 'act' | 'chapter' | 'scene' | 'codex';
    id?: string;
    label: string;
}

interface ContextSelectorProps {
    projectId: string;
    selectedContexts: ContextItem[];
    onContextsChange: (contexts: ContextItem[]) => void;
}

export function ContextSelector({ projectId, selectedContexts, onContextsChange }: ContextSelectorProps) {
    const { nodeRepository: nodeRepo, codexRepository: codexRepo } = useAppServices();

    // Fetch all nodes and codex entries for the project
    const nodes = useLiveQuery(
        () => nodeRepo.getByProject(projectId),
        [projectId, nodeRepo]
    );

    const codexEntries = useLiveQuery(
        () => codexRepo.getByProject(projectId),
        [projectId, codexRepo]
    );

    // Process nodes into hierarchy
    const acts = (nodes?.filter(n => n.type === 'act') || []) as Act[];
    const chapters = (nodes?.filter(n => n.type === 'chapter') || []) as Chapter[];
    const scenes = (nodes?.filter(n => n.type === 'scene') || []) as Scene[];

    // Group codex entries by category
    const codexByCategory = (codexEntries || []).reduce((acc, entry) => {
        const cat = entry.category || 'uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(entry);
        return acc;
    }, {} as Record<string, CodexEntry[]>);

    const addContext = (context: ContextItem) => {
        const exists = selectedContexts.some(
            c => c.type === context.type && c.id === context.id
        );
        if (!exists) {
            onContextsChange([...selectedContexts, context]);
        }
    };

    const removeContext = (index: number) => {
        onContextsChange(selectedContexts.filter((_, i) => i !== index));
    };

    const clearContexts = () => {
        onContextsChange([]);
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'character': return <User className="h-4 w-4 mr-2" />;
            case 'location': return <MapPin className="h-4 w-4 mr-2" />;
            case 'item': return <Box className="h-4 w-4 mr-2" />;
            case 'lore': return <Scroll className="h-4 w-4 mr-2" />;
            default: return <HelpCircle className="h-4 w-4 mr-2" />;
        }
    };

    const getCategoryLabel = (category: string) => {
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    return (
        <div className="space-y-2">
            {selectedContexts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedContexts.map((context, index) => (
                        <div
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                        >
                            <span className="truncate max-w-[150px]">{context.label}</span>
                            <button
                                onClick={() => removeContext(index)}
                                className="hover:bg-primary/20 rounded-sm p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearContexts}
                        className="h-6 text-xs"
                    >
                        Clear all
                    </Button>
                </div>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Context
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-[500px] overflow-y-auto">
                    {/* Global Contexts */}
                    <DropdownMenuItem onClick={() => addContext({ type: 'novel', label: 'Full Novel Text' })}>
                        <Book className="h-4 w-4 mr-2" />
                        <div>
                            <div>Full Novel Text</div>
                            <div className="text-xs text-muted-foreground">All novel text</div>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => addContext({ type: 'outline', label: 'Full Outline' })}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        <div>
                            <div>Full Outline</div>
                            <div className="text-xs text-muted-foreground">All acts, chapters, scenes</div>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Acts */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Layers className="h-4 w-4 mr-2" />
                            Acts
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56 max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Select Act</DropdownMenuLabel>
                            {acts.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No acts found</div>
                            ) : (
                                acts.map(act => (
                                    <DropdownMenuItem
                                        key={act.id}
                                        onClick={() => addContext({ type: 'act', id: act.id, label: act.title })}
                                    >
                                        {act.title}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Chapters */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Hash className="h-4 w-4 mr-2" />
                            Chapters
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64 max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Select Chapter</DropdownMenuLabel>
                            {chapters.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No chapters found</div>
                            ) : (
                                chapters.map(chapter => (
                                    <DropdownMenuItem
                                        key={chapter.id}
                                        onClick={() => addContext({ type: 'chapter', id: chapter.id, label: chapter.title })}
                                    >
                                        {chapter.title}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Scenes */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <FileText className="h-4 w-4 mr-2" />
                            Scenes
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64 max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Select Scene</DropdownMenuLabel>
                            {scenes.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No scenes found</div>
                            ) : (
                                scenes.map(scene => (
                                    <DropdownMenuItem
                                        key={scene.id}
                                        onClick={() => addContext({ type: 'scene', id: scene.id, label: scene.title })}
                                    >
                                        {scene.title}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* Codex Entries */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Book className="h-4 w-4 mr-2" />
                            Codex Entries
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                            {Object.keys(codexByCategory).length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">No codex entries found</div>
                            ) : (
                                Object.entries(codexByCategory).map(([category, entries]) => (
                                    <DropdownMenuSub key={category}>
                                        <DropdownMenuSubTrigger>
                                            {getCategoryIcon(category)}
                                            {getCategoryLabel(category)}
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-56 max-h-[300px] overflow-y-auto">
                                            {(entries as CodexEntry[]).map(entry => (
                                                <DropdownMenuItem
                                                    key={entry.id}
                                                    onClick={() => addContext({ type: 'codex', id: entry.id, label: entry.name })}
                                                >
                                                    {entry.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                ))
                            )}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                </DropdownMenuContent>
            </DropdownMenu>
        </div >
    );
}
