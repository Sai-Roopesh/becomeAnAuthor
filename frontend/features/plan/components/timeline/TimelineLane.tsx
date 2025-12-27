'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentNode, CodexEntry, SceneCodexLink } from '@/domain/entities/types';
import { CATEGORY_CONFIG } from '../../utils/timeline-utils';

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

/**
 * Individual timeline lane showing node appearances for a codex entry.
 * Uses CSS Grid for precise alignment without fragile pixel math.
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

    // Calculate grid range for the connection line
    const startCol = sceneIndices.length > 0 ? (sceneIndices[0] ?? 0) + 1 : 0;
    const endCol = sceneIndices.length > 0 ? (sceneIndices[sceneIndices.length - 1] ?? 0) + 1 : 0;

    return (
        <div
            key={lane.id}
            className={`relative border-b ${config.bgColor} h-12 grid items-center px-4`}
            style={{
                // Define grid columns based on scene count, each scene gets one column unit
                gridTemplateColumns: `repeat(${scenes.length}, minmax(120px, 1fr))`,
                gap: '0.5rem',
                minWidth: 'max-content' // Ensure lane expands to fit all columns
            }}
        >
            {/* Connection line - spans from first to last scene occurrence */}
            {sceneIndices.length > 1 && (
                <div
                    className={`absolute top-1/2 h-0.5 ${config.color} opacity-30 z-0`}
                    style={{
                        gridColumnStart: startCol,
                        gridColumnEnd: endCol + 1, // +1 because generic end line is exclusive, but we want to span fully
                        left: '50%', // adjustment to center within the start/end cells?
                        // Actually, purely grid approach:
                        // If we place it in grid, it takes up space. We want it absolute BEHIND the buttons.
                        // Better approach: Calculate percentage-based positions or just let CSS Grid handle a container layer?
                        // Let's stick to the plan: CSS Grid for general layout.
                        // For the line, strictly speaking, grid-column works if the parent is grid.
                        // But the parent IS grid.
                        // So we can place a div that spans columns.
                        gridColumn: `${startCol} / ${endCol + 1}`,
                        width: 'auto',
                        position: 'relative', // It's a grid item now
                        height: '2px',
                        placeSelf: 'center stretch',
                        zIndex: 0,
                        margin: '0 3rem' // Visual offset to not touch the edges of the first/last cell
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
                  relative z-10
                  h-8 rounded-md border-2 ${config.borderColor}
                  bg-background hover:bg-accent
                  flex items-center justify-center
                  text-xs font-medium truncate px-2
                  transition-all hover:scale-105 hover:shadow-md
                  w-full
                  ${isPov ? 'ring-2 ring-primary ring-offset-1' : ''}
                `}
                                style={{
                                    gridColumn: sceneIndex + 1, // 1-based index for grid
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
