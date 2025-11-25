'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useProjectStore } from '@/store/use-project-store';

interface StoryTimelineProps {
    projectId: string;
    activeSceneWordCount?: number;
}

export function StoryTimeline({ projectId, activeSceneWordCount }: StoryTimelineProps) {
    const { activeSceneId, setActiveSceneId } = useProjectStore();
    const [collapsed, setCollapsed] = useState(false);

    const scenes = useLiveQuery(
        () => db.nodes
            .where('projectId').equals(projectId)
            .filter(n => n.type === 'scene')
            .sortBy('order'),
        [projectId]
    );

    const handleSceneClick = (sceneId: string) => {
        setActiveSceneId(sceneId);
    };

    if (collapsed) {
        return (
            <div className="h-full w-12 bg-muted/10 border-l flex flex-col items-center py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCollapsed(false)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full w-72 bg-muted/10 border-l flex flex-col">
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold">Timeline</h3>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setCollapsed(true)}
                >
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-3">
                {scenes && scenes.length > 0 ? (
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                        {/* Scene markers */}
                        <div className="space-y-4">
                            {scenes.map((scene, index) => {
                                const isActive = scene.id === activeSceneId;
                                const sceneData = scene as any;

                                // Use live word count for active scene, stored for others
                                const displayWordCount = isActive && activeSceneWordCount !== undefined
                                    ? activeSceneWordCount
                                    : (sceneData.wordCount || 0);

                                return (
                                    <div key={scene.id} className="relative pl-8">
                                        {/* Marker dot */}
                                        <div
                                            className={`absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 ${isActive
                                                ? 'bg-primary border-primary'
                                                : 'bg-background border-border'
                                                }`}
                                        />

                                        {/* Scene info */}
                                        <button
                                            onClick={() => handleSceneClick(scene.id)}
                                            className={`text-left text-xs w-full p-2 rounded hover:bg-accent transition-colors ${isActive ? 'bg-accent font-medium' : ''
                                                }`}
                                        >
                                            <div className="font-medium truncate">
                                                Scene {index + 1}
                                            </div>
                                            <div className="text-muted-foreground truncate mt-0.5">
                                                {scene.title}
                                            </div>

                                            {/* Word Count */}
                                            <div className="text-muted-foreground mt-1">
                                                {displayWordCount.toLocaleString()} words
                                            </div>

                                            {/* POV */}
                                            {sceneData.pov && (
                                                <div className="text-muted-foreground mt-1">
                                                    POV: {sceneData.pov}
                                                </div>
                                            )}

                                            {/* Subtitle */}
                                            {sceneData.subtitle && (
                                                <div className="text-muted-foreground mt-1 italic truncate">
                                                    "{sceneData.subtitle}"
                                                </div>
                                            )}

                                            {/* AI Context Status */}
                                            <div className="mt-1 flex items-center gap-1">
                                                <span className="text-muted-foreground">AI:</span>
                                                <span className={sceneData.excludeFromAI ? 'text-orange-500' : 'text-green-500'}>
                                                    {sceneData.excludeFromAI ? 'Excluded' : 'Included'}
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground text-center py-8">
                        No scenes yet
                    </div>
                )}
            </div>

            {/* Footer stats */}
            {scenes && scenes.length > 0 && (
                <div className="p-3 border-t text-xs text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Total Scenes:</span>
                        <span className="font-medium">{scenes.length}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>Total Words:</span>
                        <span className="font-medium">
                            {scenes.reduce((sum, s) => sum + ((s as any).wordCount || 0), 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
