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
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative bg-background p-6 rounded-full shadow-xl border border-border/50">
                        <FileText className="h-12 w-12 text-primary" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-heading font-bold">Start Outlining</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Create your first Act to begin structuring your story.
                    </p>
                </div>
                <Button onClick={() => openCreateDialog(null, 'act')} size="lg" className="shadow-lg shadow-primary/20">
                    <Plus className="h-5 w-5 mr-2" /> Create First Act
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {acts.filter(filterNodes).map((act, actIndex) => {
                const chapters = getChildren(act.id);
                const isActExpanded = expandedNodes.has(act.id) || expandedNodes.size === 0;

                return (
                    <div
                        key={act.id}
                        className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
                        style={{ animationDelay: `${actIndex * 100}ms` }}
                    >
                        {/* Act Header - Sticky */}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-y border-border/50 py-3 px-4 flex items-center gap-3 shadow-sm mb-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => toggleNode(act.id)}
                            >
                                {isActExpanded ? (
                                    <ChevronDown className="h-5 w-5" />
                                ) : (
                                    <ChevronRight className="h-5 w-5" />
                                )}
                            </Button>
                            <h2 className="text-xl font-heading font-bold flex-1 tracking-tight">{act.title}</h2>
                            <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                {chapters.length} Chapters
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={(e) => { e.stopPropagation(); openCreateDialog(act.id, 'chapter'); }}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Chapter
                            </Button>
                        </div>

                        {/* Chapters */}
                        {isActExpanded && (
                            <div className="pl-4 pr-2 space-y-6">
                                {chapters.filter(filterNodes).map(chapter => {
                                    const scenes = getChildren(chapter.id);
                                    const isChapterExpanded = expandedNodes.has(chapter.id) || expandedNodes.size === 0;

                                    return (
                                        <div key={chapter.id} className="relative pl-6 border-l-2 border-border/30 hover:border-primary/30 transition-colors">
                                            {/* Chapter Header */}
                                            <div className="flex items-center gap-2 mb-3 group/chapter">
                                                <div className="absolute -left-[9px] top-2 h-4 w-4 rounded-full bg-background border-2 border-border group-hover/chapter:border-primary transition-colors" />

                                                <div
                                                    className="flex-1 flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                                    onClick={() => toggleNode(chapter.id)}
                                                >
                                                    {isChapterExpanded ? (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <h3 className="text-lg font-heading font-semibold text-foreground">{chapter.title}</h3>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover/chapter:opacity-100 transition-opacity ml-auto"
                                                        onClick={(e) => { e.stopPropagation(); openCreateDialog(chapter.id, 'scene'); }}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Scenes */}
                                            {isChapterExpanded && (
                                                <div className="space-y-2 pl-2">
                                                    {scenes.filter(filterNodes).map(scene => (
                                                        <div
                                                            key={scene.id}
                                                            className="group/scene flex items-start gap-4 p-4 bg-card border border-border/40 rounded-xl hover:border-primary/40 hover:shadow-sm hover:bg-accent/5 cursor-pointer transition-all duration-200"
                                                            onClick={() => openScene(scene.id)}
                                                        >
                                                            <div className="mt-1 p-2 bg-primary/5 rounded-lg text-primary group-hover/scene:bg-primary/10 transition-colors">
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <h4 className="font-medium text-base text-foreground group-hover/scene:text-primary transition-colors">{scene.title}</h4>
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <span className="px-2 py-0.5 bg-muted rounded-full">
                                                                            {scene.type === 'scene' && 'status' in scene ? scene.status : 'draft'}
                                                                        </span>
                                                                        <span>
                                                                            {scene.type === 'scene' && 'wordCount' in scene ? scene.wordCount : 0} words
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                                    {getSceneSummary(scene)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {scenes.length === 0 && (
                                                        <div className="flex items-center justify-center p-8 border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
                                                            <Button
                                                                variant="ghost"
                                                                className="text-muted-foreground hover:text-primary"
                                                                onClick={() => openCreateDialog(chapter.id, 'scene')}
                                                            >
                                                                <Plus className="h-4 w-4 mr-2" /> Add first scene to {chapter.title}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Add Chapter Button */}
                                <div className="pl-6">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-muted-foreground hover:text-primary h-12 border-2 border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/5 rounded-xl"
                                        onClick={() => openCreateDialog(act.id, 'chapter')}
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Add Chapter to {act.title}
                                    </Button>
                                </div>
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
