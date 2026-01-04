'use client';

import { useState, useMemo } from 'react';
import type { DocumentNode } from '@/domain/entities/types';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { useLiveQuery } from '@/hooks/use-live-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractScenes } from '../utils/timeline-utils';
import { TimelineHeader } from './timeline/TimelineHeader';
import { TimelineLane } from './timeline/TimelineLane';
import { TimelineControls, type LaneCategory } from './timeline/TimelineControls';
import { useProjectStore } from '@/store/use-project-store';

interface TimelineViewProps {
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    nodes: DocumentNode[];
    searchQuery: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TimelineView({ projectId, seriesId, nodes, searchQuery: _searchQuery }: TimelineViewProps) {
    const {
        codexRepository: codexRepo,
        sceneCodexLinkRepository: linkRepo
    } = useAppServices();

    const { setActiveSceneId, setShowSidebar } = useProjectStore();
    const [visibleCategories, setVisibleCategories] = useState<LaneCategory[]>(['character', 'subplot', 'location']);

    // Data fetching (series-level codex)
    const codexEntries = useLiveQuery(
        () => codexRepo.getBySeries(seriesId),
        [seriesId, codexRepo]
    );

    const links = useLiveQuery(
        () => linkRepo.getByProject(projectId),
        [projectId, linkRepo]
    );

    // Process data
    const scenes = useMemo(() => extractScenes(nodes), [nodes]);

    // filteredScenes removed - unused

    const visibleLanes = useMemo(() => {
        if (!codexEntries) return [];
        return codexEntries
            .filter(entry => visibleCategories.includes(entry.category as LaneCategory))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [codexEntries, visibleCategories]);

    // Calculate layout helpers
    const getScenesForLane = (codexId: string) => {
        if (!links) return [];
        return scenes.map((scene, index) => {
            const hasLink = links.some(l => l.sceneId === scene.id && l.codexId === codexId);
            return hasLink ? index : -1;
        }).filter(i => i !== -1);
    };

    const handleToggleCategory = (category: LaneCategory) => {
        setVisibleCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleOpenScene = (sceneId: string) => {
        setActiveSceneId(sceneId);
        // Ensure UI is ready for editing
        setShowSidebar(true);
        // Switch to write mode - we're already on /project?id=xxx
        // No navigation needed, just change the view mode
        const { setViewMode } = useProjectStore.getState();
        setViewMode('write');
    };


    if (!codexEntries) return <div className="p-8 text-center text-muted-foreground">Loading timeline...</div>;

    return (
        <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden shadow-sm">
            <TimelineControls
                visibleCategories={visibleCategories}
                onToggleCategory={handleToggleCategory}
                codexEntries={codexEntries}
                sceneCount={scenes.length}
                laneCount={visibleLanes.length}
            />

            <div className="flex-1 relative overflow-hidden">
                <ScrollArea className="h-full w-full">
                    <div className="relative min-w-max">
                        <div className="flex">
                            {/* Sticky Header Column */}
                            <div className="sticky left-0 z-20 bg-background shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <TimelineHeader
                                    lanes={visibleLanes}
                                    getScenesForLane={getScenesForLane}
                                />
                            </div>

                            {/* Main Grid Content */}
                            <div className="flex flex-col">
                                {/* Top Scene Track */}
                                <div className="h-10 border-b bg-muted/30 flex items-center px-4 sticky top-0 z-10 grid gap-2"
                                    style={{ gridTemplateColumns: `repeat(${scenes.length}, minmax(120px, 1fr))` }}>
                                    {scenes.map((scene, i) => (
                                        <div key={scene.id} className="text-xs font-medium text-muted-foreground truncate px-1 border-l first:border-l-0 border-border/50">
                                            {i + 1}. {scene.title}
                                        </div>
                                    ))}
                                </div>

                                {/* Lanes */}
                                {visibleLanes.map(lane => (
                                    <TimelineLane
                                        key={lane.id}
                                        lane={lane}
                                        scenes={scenes}
                                        sceneIndices={getScenesForLane(lane.id)}
                                        links={links}
                                        totalWidth={0} // Unused now with grid
                                        onOpenScene={handleOpenScene}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
