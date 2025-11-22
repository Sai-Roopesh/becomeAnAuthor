'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SceneActionMenu } from './scene-action-menu';
import { useEffect, useState } from 'react';

interface SceneDetailsPanelProps {
    sceneId: string;
    wordCount: number;
}

export function SceneDetailsPanel({ sceneId, wordCount }: SceneDetailsPanelProps) {
    const scene = useLiveQuery(() => db.nodes.get(sceneId), [sceneId]);
    const [sceneNumber, setSceneNumber] = useState(0);

    useEffect(() => {
        // Calculate scene number by counting scenes in project before this one
        if (scene) {
            db.nodes
                .where('projectId')
                .equals(scene.projectId)
                .filter(n => n.type === 'scene' && (n.order || 0) <= (scene.order || 0))
                .count()
                .then(setSceneNumber);
        }
    }, [scene]);

    if (!scene || scene.type !== 'scene') return null;

    const sceneData = scene as any;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Scene Details</CardTitle>
                    <SceneActionMenu sceneId={sceneId} />
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
                {/* Scene Number */}
                <div>
                    <div className="text-xs text-muted-foreground">Scene Number</div>
                    <div className="text-sm font-medium">Scene {sceneNumber}</div>
                </div>

                {/* Word Count */}
                <div>
                    <div className="text-xs text-muted-foreground">Word Count</div>
                    <div className="text-sm font-medium">{wordCount.toLocaleString()} words</div>
                </div>

                {/* POV */}
                {sceneData.pov && (
                    <div>
                        <div className="text-xs text-muted-foreground">Point of View</div>
                        <div className="text-sm font-medium">{sceneData.pov}</div>
                    </div>
                )}

                {/* Subtitle */}
                {sceneData.subtitle && (
                    <div>
                        <div className="text-xs text-muted-foreground">Subtitle</div>
                        <div className="text-sm font-medium">{sceneData.subtitle}</div>
                    </div>
                )}

                {/* Summary */}
                {sceneData.summary && (
                    <div>
                        <div className="text-xs text-muted-foreground">Summary</div>
                        <div className="text-sm text-muted-foreground leading-relaxed border-l-2 pl-3">
                            {sceneData.summary}
                        </div>
                    </div>
                )}

                {/* AI Context Status */}
                <div>
                    <div className="text-xs text-muted-foreground">AI Context</div>
                    <div className="text-sm font-medium">
                        {sceneData.excludeFromAI ? (
                            <span className="text-orange-500">Excluded</span>
                        ) : (
                            <span className="text-green-500">Included</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
