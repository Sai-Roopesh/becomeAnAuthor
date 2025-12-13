'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentNode, CodexEntry } from '@/lib/config/types';
import type { SceneCodexLink } from '@/domain/repositories';
import { CATEGORY_CONFIG, TIMELINE_LAYOUT } from '../../utils/timeline-utils';

interface TimelineLaneProps {
    lane: CodexEntry;
    scenes: DocumentNode[];
    sceneIndices: number[];
    links: SceneCodexLink[] | undefined;
    totalWidth: number;
    onOpenScene: (sceneId: string) => void;
}

/**
 * Individual timeline lane showing node appearances for a codex entry.
 */
export function TimelineLane({
    lane,
    scenes,
    sceneIndices,
    links,
    totalWidth,
    onOpenScene,
}: TimelineLaneProps) {
    const config = CATEGORY_CONFIG[lane.category];
    const { SCENE_WIDTH, SCENE_GAP, LANE_HEIGHT } = TIMELINE_LAYOUT;

    return (
        <div
            key={lane.id}
            className={`relative border-b ${config.bgColor}`}
            style={{ height: LANE_HEIGHT, width: totalWidth }}
        >
            {/* Connection line */}
            {sceneIndices.length > 1 &&
                sceneIndices[0] !== undefined &&
                sceneIndices[sceneIndices.length - 1] !== undefined && (
                    <div
                        className={`absolute top-1/2 h-0.5 ${config.color} opacity-30`}
                        style={{
                            left: sceneIndices[0] * (SCENE_WIDTH + SCENE_GAP) + SCENE_WIDTH / 2,
                            width:
                                ((sceneIndices[sceneIndices.length - 1] ?? 0) - (sceneIndices[0] ?? 0)) *
                                (SCENE_WIDTH + SCENE_GAP),
                        }}
                    />
                )}

            {/* Scene nodes */}
            {sceneIndices.map((sceneIndex) => {
                const scene = scenes[sceneIndex];
                if (!scene) return null;
                const link = links?.find((l) => l.sceneId === scene.id && l.codexId === lane.id);
                const isPov = link?.role === 'pov';

                return (
                    <Tooltip key={scene.id}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onOpenScene(scene.id)}
                                className={`
                  absolute top-1/2 -translate-y-1/2
                  h-8 rounded-md border-2 ${config.borderColor}
                  bg-background hover:bg-accent
                  flex items-center justify-center
                  text-xs font-medium truncate px-2
                  transition-all hover:scale-105 hover:shadow-md
                  ${isPov ? 'ring-2 ring-primary ring-offset-1' : ''}
                `}
                                style={{
                                    left: sceneIndex * (SCENE_WIDTH + SCENE_GAP),
                                    width: SCENE_WIDTH - SCENE_GAP,
                                }}
                            >
                                <span className="truncate">{scene.title}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <div className="font-medium">{scene.title}</div>
                            {isPov && <div className="text-xs text-primary">POV Character</div>}
                            <div className="text-xs text-muted-foreground">
                                {scene.type === 'scene' && 'wordCount' in scene ? scene.wordCount : 0} words
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
