'use client';

import { DocumentNode } from '@/lib/config/types';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { SceneCard } from './scene-card';
import { useState } from 'react';
import { CreateNodeDialog } from '@/features/project/components/CreateNodeDialog';

interface GridViewProps {
    projectId: string;
    nodes: DocumentNode[];
    searchQuery: string;
}

export function GridView({ projectId, nodes, searchQuery }: GridViewProps) {
    const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
    const [dialogState, setDialogState] = useState<{
        open: boolean;
        parentId: string | null;
        type: 'act' | 'chapter' | 'scene';
    }>({ open: false, parentId: null, type: 'act' });

    const acts = nodes.filter(n => n.type === 'act');
    const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);

    const toggleAct = (actId: string) => {
        const newExpanded = new Set(expandedActs);
        if (newExpanded.has(actId)) {
            newExpanded.delete(actId);
        } else {
            newExpanded.add(actId);
        }
        setExpandedActs(newExpanded);
    };

    const openCreateDialog = (parentId: string | null, type: 'act' | 'chapter' | 'scene') => {
        setDialogState({ open: true, parentId, type });
    };

    const filterNodes = (node: DocumentNode): boolean => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            node.title.toLowerCase().includes(query) ||
            (node.type === 'scene' && 'content' in node && JSON.stringify(node.content).toLowerCase().includes(query))
        );
    };

    if (acts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="text-muted-foreground">
                    <p className="text-lg font-medium">Nothing here yet!</p>
                    <p className="text-sm">Start your novel by creating your first act.</p>
                </div>
                <Button onClick={() => openCreateDialog(null, 'act')}>
                    <Plus className="h-4 w-4 mr-2" /> Create First Act
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {acts.filter(filterNodes).map(act => {
                const chapters = getChildren(act.id);
                const isExpanded = expandedActs.has(act.id) || expandedActs.size === 0;

                return (
                    <div key={act.id} className="border rounded-lg overflow-hidden">
                        {/* Act Header */}
                        <div className="bg-muted/50 p-4 flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleAct(act.id)}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </Button>
                            <h2 className="text-lg font-semibold flex-1">{act.title}</h2>
                            <span className="text-sm text-muted-foreground">
                                {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCreateDialog(act.id, 'chapter')}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Chapter
                            </Button>
                        </div>

                        {/* Chapters Grid */}
                        {isExpanded && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {chapters.filter(filterNodes).map(chapter => {
                                    const scenes = getChildren(chapter.id);
                                    return (
                                        <div key={chapter.id} className="border rounded-lg overflow-hidden">
                                            {/* Chapter Header */}
                                            <div className="bg-muted/30 p-3 flex items-center justify-between">
                                                <h3 className="font-medium">{chapter.title}</h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    onClick={() => openCreateDialog(chapter.id, 'scene')}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Scenes */}
                                            <div className="p-2 space-y-2">
                                                {scenes.filter(filterNodes).map(scene => (
                                                    <SceneCard key={scene.id} scene={scene} />
                                                ))}
                                                {scenes.length === 0 && (
                                                    <div className="text-center p-4 text-sm text-muted-foreground">
                                                        No scenes yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            <CreateNodeDialog
                open={dialogState.open}
                onOpenChange={(open) => setDialogState(prev => ({ ...prev, open }))}
                projectId={projectId}
                parentId={dialogState.parentId}
                type={dialogState.type}
            />
        </div>
    );
}
