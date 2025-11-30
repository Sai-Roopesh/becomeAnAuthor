'use client';

import { DocumentNode } from '@/lib/config/types';
import { useProjectStore } from '@/store/use-project-store';
import { ChevronRight, ChevronDown, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateNodeDialog } from '@/features/shared/components';

interface OutlineViewProps {
    projectId: string;
    nodes: DocumentNode[];
    searchQuery: string;
}

export function OutlineView({ projectId, nodes, searchQuery }: OutlineViewProps) {
    const { setActiveSceneId, setViewMode } = useProjectStore();
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [dialogState, setDialogState] = useState<{
        open: boolean;
        parentId: string | null;
        type: 'act' | 'chapter' | 'scene';
    }>({ open: false, parentId: null, type: 'act' });

    const acts = nodes.filter(n => n.type === 'act');
    const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);

    const toggleNode = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }
        setExpandedNodes(newExpanded);
    };

    const openCreateDialog = (parentId: string | null, type: 'act' | 'chapter' | 'scene') => {
        setDialogState({ open: true, parentId, type });
    };

    const openScene = (sceneId: string) => {
        setActiveSceneId(sceneId);
        setViewMode('write');
    };

    const getSceneSummary = (scene: DocumentNode): string => {
        if (scene.type !== 'scene' || !('summary' in scene)) return '';
        return scene.summary || 'No summary yet...';
    };

    const filterNodes = (node: DocumentNode): boolean => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return node.title.toLowerCase().includes(query) ||
            (node.type === 'scene' && getSceneSummary(node).toLowerCase().includes(query));
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
        <div className="max-w-4xl mx-auto space-y-4">
            {acts.filter(filterNodes).map(act => {
                const chapters = getChildren(act.id);
                const isActExpanded = expandedNodes.has(act.id) || expandedNodes.size === 0;

                return (
                    <div key={act.id} className="border rounded-lg overflow-hidden">
                        {/* Act */}
                        <div className="flex items-center gap-2 p-3 bg-muted/50 hover:bg-muted/70 cursor-pointer" onClick={() => toggleNode(act.id)}>
                            {isActExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <h2 className="text-xl font-bold flex-1">{act.title}</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); openCreateDialog(act.id, 'chapter'); }}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Chapter
                            </Button>
                        </div>

                        {/* Chapters */}
                        {isActExpanded && (
                            <div className="p-4 space-y-3">
                                {chapters.filter(filterNodes).map(chapter => {
                                    const scenes = getChildren(chapter.id);
                                    const isChapterExpanded = expandedNodes.has(chapter.id) || expandedNodes.size === 0;

                                    return (
                                        <div key={chapter.id} className="border-l-2 border-muted pl-4 space-y-2">
                                            {/* Chapter */}
                                            <div className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded" onClick={() => toggleNode(chapter.id)}>
                                                {isChapterExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <h3 className="text-lg font-semibold flex-1">{chapter.title}</h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); openCreateDialog(chapter.id, 'scene'); }}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Scenes */}
                                            {isChapterExpanded && (
                                                <div className="ml-6 space-y-2">
                                                    {scenes.filter(filterNodes).map(scene => (
                                                        <div
                                                            key={scene.id}
                                                            className="flex items-start gap-3 p-3 border rounded hover:bg-accent/50 cursor-pointer"
                                                            onClick={() => openScene(scene.id)}
                                                        >
                                                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-medium text-sm mb-1">{scene.title}</h4>
                                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                                    {getSceneSummary(scene)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {scenes.length === 0 && (
                                                        <div className="text-center p-4 text-sm text-muted-foreground">
                                                            No scenes yet
                                                        </div>
                                                    )}
                                                </div>
                                            )}
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
