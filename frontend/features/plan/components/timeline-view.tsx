'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { useCodexRepository } from '@/features/codex/hooks/use-codex-repository';
import { useSceneCodexLinkRepository } from '@/hooks/use-scene-codex-link-repository';
import { useProjectStore } from '@/store/use-project-store';
import type { DocumentNode, CodexEntry, CodexCategory, SceneCodexLink } from '@/lib/config/types';
import { Button } from '@/components/ui/button';
import {
    User, MapPin, Scroll, BookOpen, Sparkles,
    Plus, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineViewProps {
    projectId: string;
    nodes: DocumentNode[];
    searchQuery: string;
}

// Category configuration
const CATEGORY_CONFIG: Record<CodexCategory, { icon: typeof User; color: string; bgColor: string; borderColor: string }> = {
    character: {
        icon: User,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800'
    },
    location: {
        icon: MapPin,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800'
    },
    subplot: {
        icon: Scroll,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-800'
    },
    item: {
        icon: Sparkles,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800'
    },
    lore: {
        icon: BookOpen,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50 dark:bg-rose-950/30',
        borderColor: 'border-rose-200 dark:border-rose-800'
    },
};

// Lane types for filtering
type LaneCategory = 'character' | 'subplot' | 'location';

/**
 * Timeline View - Plottr-style horizontal lanes
 * Shows characters/plots as lanes with scenes positioned on them
 */
export function TimelineView({ projectId, nodes, searchQuery }: TimelineViewProps) {
    const { setActiveSceneId, setViewMode } = useProjectStore();
    const codexRepo = useCodexRepository();
    const linkRepo = useSceneCodexLinkRepository();

    const [visibleCategories, setVisibleCategories] = useState<LaneCategory[]>(['character', 'subplot']);
    const [scrollPosition, setScrollPosition] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Get codex entries for lanes
    const codexEntries = useLiveQuery(
        () => codexRepo.getByProject(projectId),
        [projectId, codexRepo]
    );

    // Get all scene-codex links
    const links = useLiveQuery(
        () => linkRepo.getByProject(projectId),
        [projectId, linkRepo]
    );

    // Extract scenes in order
    const scenes = useMemo(() => {
        const acts = nodes.filter(n => n.type === 'act').sort((a, b) => a.order - b.order);
        const allScenes: DocumentNode[] = [];

        acts.forEach(act => {
            const chapters = nodes
                .filter(n => n.type === 'chapter' && n.parentId === act.id)
                .sort((a, b) => a.order - b.order);

            chapters.forEach(chapter => {
                const chapterScenes = nodes
                    .filter(n => n.type === 'scene' && n.parentId === chapter.id)
                    .sort((a, b) => a.order - b.order);
                allScenes.push(...chapterScenes);
            });
        });

        return allScenes;
    }, [nodes]);

    // Get chapter boundaries for timeline markers
    const chapterBoundaries = useMemo(() => {
        const boundaries: { id: string; title: string; startIndex: number }[] = [];
        let currentIndex = 0;

        const acts = nodes.filter(n => n.type === 'act').sort((a, b) => a.order - b.order);
        acts.forEach(act => {
            const chapters = nodes
                .filter(n => n.type === 'chapter' && n.parentId === act.id)
                .sort((a, b) => a.order - b.order);

            chapters.forEach(chapter => {
                const chapterScenes = nodes.filter(n => n.type === 'scene' && n.parentId === chapter.id);
                boundaries.push({
                    id: chapter.id,
                    title: chapter.title,
                    startIndex: currentIndex
                });
                currentIndex += chapterScenes.length;
            });
        });

        return boundaries;
    }, [nodes]);

    // Filter lanes by visible categories
    const lanes = useMemo(() => {
        if (!codexEntries) return [];
        return codexEntries
            .filter(e => visibleCategories.includes(e.category as LaneCategory))
            .sort((a, b) => {
                // Sort by category first, then by name
                const catOrder = ['character', 'subplot', 'location'];
                const catDiff = catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
                if (catDiff !== 0) return catDiff;
                return a.name.localeCompare(b.name);
            });
    }, [codexEntries, visibleCategories]);

    // Get scenes for a lane (codex entry)
    const getScenesForLane = (codexId: string): number[] => {
        if (!links) return [];
        const linkedSceneIds = links
            .filter(l => l.codexId === codexId)
            .map(l => l.sceneId);

        return scenes
            .map((scene, index) => linkedSceneIds.includes(scene.id) ? index : -1)
            .filter(i => i >= 0);
    };

    // Open scene
    const openScene = (sceneId: string) => {
        setActiveSceneId(sceneId);
        setViewMode('write');
    };

    // Toggle category
    const toggleCategory = (category: LaneCategory) => {
        setVisibleCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Scene width and spacing
    const SCENE_WIDTH = 100;
    const SCENE_GAP = 8;
    const LANE_HEIGHT = 48;
    const HEADER_WIDTH = 180;

    const totalWidth = scenes.length * (SCENE_WIDTH + SCENE_GAP);

    if (scenes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative bg-background p-6 rounded-full shadow-xl border border-border/50">
                        <Layers className="h-12 w-12 text-primary" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-heading font-bold">Timeline View</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Create scenes and link codex entries to visualize your story's timeline.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Timeline Controls */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Show:</span>
                    {(['character', 'subplot', 'location'] as LaneCategory[]).map(cat => {
                        const config = CATEGORY_CONFIG[cat];
                        const Icon = config.icon;
                        const isActive = visibleCategories.includes(cat);
                        const count = codexEntries?.filter(e => e.category === cat).length || 0;

                        return (
                            <Button
                                key={cat}
                                variant={isActive ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => toggleCategory(cat)}
                            >
                                <Icon className="h-3 w-3" />
                                {cat === 'character' ? 'Characters' : cat === 'subplot' ? 'Plots' : 'Locations'}
                                <span className="text-[10px] opacity-70">({count})</span>
                            </Button>
                        );
                    })}
                </div>
                <div className="text-xs text-muted-foreground">
                    {scenes.length} scenes • {lanes.length} lanes
                </div>
            </div>

            {/* Timeline Container */}
            <div className="flex-1 overflow-hidden relative">
                {/* Sticky Lane Headers */}
                <div
                    className="absolute left-0 top-0 bottom-0 z-10 bg-background border-r"
                    style={{ width: HEADER_WIDTH }}
                >
                    {/* Chapter header row */}
                    <div
                        className="h-10 border-b bg-muted/50 flex items-center px-3"
                        style={{ width: HEADER_WIDTH }}
                    >
                        <span className="text-xs font-medium text-muted-foreground">Codex Entry</span>
                    </div>

                    {/* Lane headers */}
                    <div className="overflow-hidden">
                        {lanes.map(lane => {
                            const config = CATEGORY_CONFIG[lane.category];
                            const Icon = config.icon;
                            const sceneIndices = getScenesForLane(lane.id);

                            return (
                                <div
                                    key={lane.id}
                                    className={`flex items-center gap-2 px-3 border-b ${config.bgColor}`}
                                    style={{ height: LANE_HEIGHT }}
                                >
                                    <div className={`h-6 w-6 rounded-full ${config.bgColor} ${config.color} flex items-center justify-center flex-shrink-0 ring-1 ${config.borderColor}`}>
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

                {/* Scrollable Timeline */}
                <div
                    ref={timelineRef}
                    className="overflow-x-auto overflow-y-auto h-full"
                    style={{ marginLeft: HEADER_WIDTH }}
                >
                    {/* Chapter markers row */}
                    <div className="sticky top-0 z-5 h-10 border-b bg-muted/50 flex" style={{ width: totalWidth }}>
                        {chapterBoundaries.map((boundary, idx) => {
                            const nextBoundary = chapterBoundaries[idx + 1];
                            const endIndex = nextBoundary ? nextBoundary.startIndex : scenes.length;
                            const width = (endIndex - boundary.startIndex) * (SCENE_WIDTH + SCENE_GAP);

                            return (
                                <div
                                    key={boundary.id}
                                    className="flex items-center px-2 border-r border-border/50"
                                    style={{
                                        width: width,
                                        left: boundary.startIndex * (SCENE_WIDTH + SCENE_GAP)
                                    }}
                                >
                                    <span className="text-xs font-medium truncate">{boundary.title}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Lanes with scene nodes */}
                    {lanes.map(lane => {
                        const config = CATEGORY_CONFIG[lane.category];
                        const sceneIndices = getScenesForLane(lane.id);

                        return (
                            <div
                                key={lane.id}
                                className={`relative border-b ${config.bgColor}`}
                                style={{ height: LANE_HEIGHT, width: totalWidth }}
                            >
                                {/* Connection line */}
                                {sceneIndices.length > 1 && (
                                    <div
                                        className={`absolute top-1/2 h-0.5 ${config.color} opacity-30`}
                                        style={{
                                            left: sceneIndices[0] * (SCENE_WIDTH + SCENE_GAP) + SCENE_WIDTH / 2,
                                            width: (sceneIndices[sceneIndices.length - 1] - sceneIndices[0]) * (SCENE_WIDTH + SCENE_GAP),
                                        }}
                                    />
                                )}

                                {/* Scene nodes */}
                                {sceneIndices.map(sceneIndex => {
                                    const scene = scenes[sceneIndex];
                                    const link = links?.find(l => l.sceneId === scene.id && l.codexId === lane.id);
                                    const isPov = link?.role === 'pov';

                                    return (
                                        <Tooltip key={scene.id}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => openScene(scene.id)}
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
                    })}
                </div>
            </div>
        </div>
    );
}
