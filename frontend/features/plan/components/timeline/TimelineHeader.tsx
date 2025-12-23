'use client';

import type { CodexEntry } from '@/lib/config/types';
import { CATEGORY_CONFIG } from '../../utils/timeline-utils';

interface TimelineHeaderProps {
    lanes: CodexEntry[];
    getScenesForLane: (codexId: string) => number[];
}

/**
 * Sticky header showing lane labels and codex entries.
 */
export function TimelineHeader({ lanes, getScenesForLane }: TimelineHeaderProps) {
    return (
        <div className="absolute left-0 top-0 bottom-0 z-10 bg-background border-r w-48 flex flex-col">
            {/* Chapter header row */}
            <div className="h-10 border-b bg-muted/50 flex items-center px-3 flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Codex Entry</span>
            </div>

            {/* Lane headers */}
            <div className="flex-1 overflow-hidden">
                {lanes.map((lane) => {
                    const config = CATEGORY_CONFIG[lane.category];
                    const Icon = config.icon;
                    const sceneIndices = getScenesForLane(lane.id);

                    return (
                        <div
                            key={lane.id}
                            className={`flex items-center gap-2 px-3 border-b ${config.bgColor} h-12`}
                        >
                            <div
                                className={`h-6 w-6 rounded-full ${config.bgColor} ${config.color} flex items-center justify-center flex-shrink-0 ring-1 ${config.borderColor}`}
                            >
                                {lane.thumbnail ? (
                                    <img src={lane.thumbnail} alt="" className="h-full w-full rounded-full object-cover" />
                                ) : (
                                    <Icon className="h-3 w-3" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{lane.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                    {sceneIndices.length} scene{sceneIndices.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
