'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FileText, Clock, Hash } from 'lucide-react';
import { useState } from 'react';
import { useProjectStore } from '@/store/use-project-store';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface StoryTimelineProps {
    projectId: string;
    activeSceneWordCount?: number;
    /** Hide the header (Timeline title) when used inside a tabbed panel */
    hideHeader?: boolean;
}

export function StoryTimeline({ projectId, activeSceneWordCount, hideHeader = false }: StoryTimelineProps) {
    const { activeSceneId, setActiveSceneId } = useProjectStore();
    const [collapsed, setCollapsed] = useState(false);
    const { nodeRepository: nodeRepo } = useAppServices();

    const scenes = useLiveQuery(
        async () => {
            const nodes = await nodeRepo.getByProject(projectId);
            return nodes.filter(n => n.type === 'scene');
        },
        [projectId, nodeRepo]
    );

    const handleSceneClick = (sceneId: string) => {
        setActiveSceneId(sceneId);
    };

    if (collapsed) {
        return (
            <div className="h-full w-12 bg-muted/10 border-l border-border/50 flex flex-col items-center py-4 backdrop-blur-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => setCollapsed(false)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header - only shown when not inside a tabbed panel */}
            {!hideHeader && (
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-heading font-semibold">Timeline</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => setCollapsed(true)}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Timeline */}
            <ScrollArea className="flex-1 p-4">
                {scenes && scenes.length > 0 ? (
                    <div className="relative pl-4">
                        {/* Vertical line */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

                        {/* Scene markers */}
                        <div className="space-y-6">
                            {scenes.map((scene, index) => {
                                const isActive = scene.id === activeSceneId;
                                const sceneData = scene as any;

                                // Use live word count for active scene, stored for others
                                const displayWordCount = isActive && activeSceneWordCount !== undefined
                                    ? activeSceneWordCount
                                    : (sceneData.wordCount || 0);

                                return (
                                    <div key={scene.id} className="relative pl-6 group">
                                        {/* Marker dot */}
                                        <div
                                            className={cn(
                                                "absolute left-[15px] top-3 h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 z-10",
                                                isActive
                                                    ? 'bg-primary border-primary scale-125 shadow-[0_0_10px_rgba(var(--primary),0.5)]'
                                                    : 'bg-background border-muted-foreground/30 group-hover:border-primary/50 group-hover:bg-primary/10'
                                            )}
                                        />

                                        {/* Scene Card */}
                                        <button
                                            onClick={() => handleSceneClick(scene.id)}
                                            className={cn(
                                                "text-left w-full p-3 rounded-xl border transition-all duration-200",
                                                isActive
                                                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                                                    : 'bg-card/50 border-transparent hover:bg-card hover:border-border/50 hover:shadow-sm'
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                    Scene {index + 1}
                                                </span>
                                                {sceneData.excludeFromAI && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title="Excluded from AI context" />
                                                )}
                                            </div>

                                            <div className={cn(
                                                "font-heading font-medium text-sm mb-1 line-clamp-2",
                                                isActive ? 'text-primary' : 'text-foreground'
                                            )}>
                                                {scene.title}
                                            </div>

                                            {sceneData.subtitle && (
                                                <div className="text-xs text-muted-foreground italic truncate mb-2 opacity-80">
                                                    "{sceneData.subtitle}"
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                                                <div className="flex items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    <span>{displayWordCount.toLocaleString()}</span>
                                                </div>
                                                {sceneData.pov && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                                        <span>{sceneData.pov}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                            <FileText className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No scenes yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Create scenes in the Plan view</p>
                    </div>
                )}
            </ScrollArea>

            {/* Footer stats */}
            {scenes && scenes.length > 0 && (
                <div className="p-3 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span>Total Scenes</span>
                        <span className="font-medium font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border/30">
                            {scenes.length}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Total Words</span>
                        <span className="font-medium font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border/30">
                            {scenes.reduce((sum, s) => sum + ((s as any).wordCount || 0), 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
