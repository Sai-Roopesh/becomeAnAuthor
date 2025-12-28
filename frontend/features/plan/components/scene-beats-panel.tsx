'use client';

// useState removed - unused
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Sparkles,
    Plus,
    X,
    Zap,
    Sun,
    Moon,
    Target,
    Flag,
    Flame,
    CircleDot,
    Lightbulb,
    Gift
} from 'lucide-react';
import type { Beat } from '@/domain/entities/types';

/**
 * Story beat types with their metadata
 */
export const STORY_BEATS = {
    opening: { label: 'Opening', icon: Sun, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    inciting_incident: { label: 'Inciting Incident', icon: Zap, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    lock_in: { label: 'Lock-In / Point of No Return', icon: Target, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    midpoint: { label: 'Midpoint', icon: CircleDot, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    dark_night: { label: 'Dark Night / All Is Lost', icon: Moon, color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400' },
    climax: { label: 'Climax', icon: Flame, color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' },
    resolution: { label: 'Resolution', icon: Flag, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    setup: { label: 'Setup', icon: Lightbulb, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    payoff: { label: 'Payoff', icon: Gift, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
} as const;

export type StoryBeatType = keyof typeof STORY_BEATS;

interface SceneBeatsPanelProps {
    beats: Beat[];
    onAddBeat: (beatType: StoryBeatType) => void;
    onRemoveBeat: (beatId: string) => void;
    onToggleBeat: (beatId: string) => void;
    readonly?: boolean;
}

/**
 * Panel for managing story beats on a scene
 * Allows adding predefined beat types and tracking completion
 */
export function SceneBeatsPanel({
    beats,
    onAddBeat,
    onRemoveBeat,
    onToggleBeat,
    readonly = false
}: SceneBeatsPanelProps) {
    // Get beat types already assigned to this scene
    const assignedTypes = beats.map(b => b.text as StoryBeatType);
    const availableBeats = Object.entries(STORY_BEATS).filter(
        ([key]) => !assignedTypes.includes(key as StoryBeatType)
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Story Beats
                </h4>
                {!readonly && availableBeats.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Add Story Beat</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {availableBeats.map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                    <DropdownMenuItem
                                        key={key}
                                        onClick={() => onAddBeat(key as StoryBeatType)}
                                        className="flex items-center gap-2"
                                    >
                                        <Icon className="h-4 w-4" />
                                        {config.label}
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {beats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                    No story beats assigned to this scene.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {beats.map(beat => {
                        const beatConfig = STORY_BEATS[beat.text as StoryBeatType];
                        if (!beatConfig) return null;
                        const Icon = beatConfig.icon;

                        return (
                            <Badge
                                key={beat.id}
                                variant="secondary"
                                className={`
                                    ${beatConfig.color} 
                                    ${beat.isCompleted ? 'opacity-60 line-through' : ''} 
                                    flex items-center gap-1.5 pr-1 group cursor-pointer
                                `}
                                onClick={() => !readonly && onToggleBeat(beat.id)}
                            >
                                <Icon className="h-3 w-3" />
                                <span>{beatConfig.label}</span>
                                {!readonly && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveBeat(beat.id);
                                        }}
                                        className="ml-1 h-4 w-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </Badge>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * Compact version for timeline/card views
 */
export function SceneBeatsBadges({ beats }: { beats: Beat[] }) {
    if (!beats || beats.length === 0) return null;

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {beats.slice(0, 3).map(beat => {
                const beatConfig = STORY_BEATS[beat.text as StoryBeatType];
                if (!beatConfig) return null;
                const Icon = beatConfig.icon;

                return (
                    <div
                        key={beat.id}
                        className={`h-5 w-5 rounded-full flex items-center justify-center ${beatConfig.color}`}
                        title={beatConfig.label}
                    >
                        <Icon className="h-3 w-3" />
                    </div>
                );
            })}
            {beats.length > 3 && (
                <span className="text-xs text-muted-foreground">+{beats.length - 3}</span>
            )}
        </div>
    );
}
