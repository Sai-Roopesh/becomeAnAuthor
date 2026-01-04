'use client';

import { useMemo } from 'react';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scroll, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import type { CodexEntry, DocumentNode } from '@/domain/entities/types';
import { ViewHeader } from '@/components/layout/view-header';
import { SUBPLOT_WEAK_THRESHOLD_PERCENT, SUBPLOT_DOMINANT_THRESHOLD_PERCENT } from '../constants';

interface SubplotTrackerProps {
    projectId: string;
    seriesId: string;
}

interface SubplotStats {
    subplot: CodexEntry;
    sceneCount: number;
    scenes: DocumentNode[];
    percentage: number;
    status: 'orphan' | 'weak' | 'balanced' | 'dominant';
}

/**
 * Subplot Tracker Dashboard
 * Shows subplot progression across scenes with visual progress bars
 */
export function SubplotTracker({ projectId, seriesId }: SubplotTrackerProps) {
    const {
        codexRepository: codexRepo,
        sceneCodexLinkRepository: linkRepo,
        nodeRepository: nodeRepo
    } = useAppServices();

    // Fetch subplots from codex (series-level)
    const codexEntries = useLiveQuery(
        () => codexRepo.getBySeries(seriesId),
        [seriesId, codexRepo]
    );

    // Fetch all scene-codex links
    const links = useLiveQuery(
        () => linkRepo.getByProject(projectId),
        [projectId, linkRepo]
    );

    // Fetch all nodes to get scenes
    const nodes = useLiveQuery(
        () => nodeRepo.getByProject(projectId),
        [projectId, nodeRepo]
    );

    // Filter to subplots only
    const subplots = useMemo(() => {
        if (!codexEntries) return [];
        return codexEntries.filter(e => e.category === 'subplot');
    }, [codexEntries]);

    // Get all scenes
    const scenes = useMemo(() => {
        if (!nodes) return [];
        return nodes.filter((n): n is DocumentNode => n.type === 'scene');
    }, [nodes]);

    // Calculate subplot statistics
    const subplotStats: SubplotStats[] = useMemo(() => {
        if (!subplots.length || !scenes.length) return [];

        return subplots.map(subplot => {
            const subplotLinks = links?.filter(l => l.codexId === subplot.id) || [];
            const linkedSceneIds = subplotLinks.map(l => l.sceneId);
            const linkedScenes = scenes.filter(s => linkedSceneIds.includes(s.id));
            const sceneCount = linkedScenes.length;
            const percentage = scenes.length > 0 ? (sceneCount / scenes.length) * 100 : 0;

            // Determine status based on scene presence
            let status: SubplotStats['status'];
            if (sceneCount === 0) {
                status = 'orphan';
            } else if (percentage < SUBPLOT_WEAK_THRESHOLD_PERCENT) {
                status = 'weak';
            } else if (percentage > SUBPLOT_DOMINANT_THRESHOLD_PERCENT) {
                status = 'dominant';
            } else {
                status = 'balanced';
            }

            return {
                subplot,
                sceneCount,
                scenes: linkedScenes,
                percentage,
                status,
            };
        }).sort((a, b) => b.sceneCount - a.sceneCount);
    }, [subplots, scenes, links]);

    // Summary stats
    const orphanCount = subplotStats.filter(s => s.status === 'orphan').length;
    const totalSubplots = subplots.length;
    const avgPresence = subplotStats.length > 0
        ? Math.round(subplotStats.reduce((sum, s) => sum + s.percentage, 0) / subplotStats.length)
        : 0;

    if (!codexEntries || !links || !nodes) {
        return <div className="p-8 text-center text-muted-foreground">Loading subplot data...</div>;
    }

    if (subplots.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Scroll className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Subplots Found</h3>
                <p className="text-muted-foreground max-w-md">
                    Create subplot entries in your Codex to track their progression across scenes.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            <ViewHeader
                title="Subplot Tracker"
                icon={<TrendingUp className="h-5 w-5" />}
                subtitle={`Tracking ${totalSubplots} subplots across ${scenes.length} scenes`}
            />

            <ScrollArea className="flex-1 p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Scroll className="h-4 w-4" />
                                Total Subplots
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalSubplots}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Orphan Subplots
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${orphanCount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {orphanCount}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {orphanCount > 0 ? 'Need scene links' : 'All connected'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Avg. Presence
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{avgPresence}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Across all scenes</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Subplot Progress Bars */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Scroll className="h-5 w-5 text-primary" />
                        Subplot Distribution
                    </h3>

                    <div className="space-y-3">
                        {subplotStats.map(stat => (
                            <Card key={stat.subplot.id} className="p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">{stat.subplot.name}</span>
                                        <StatusBadge status={stat.status} />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {stat.sceneCount} / {scenes.length} scenes
                                    </span>
                                </div>
                                <Progress
                                    value={stat.percentage}
                                    className="h-2"
                                />
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {stat.percentage.toFixed(1)}% of manuscript
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

function StatusBadge({ status }: { status: SubplotStats['status'] }) {
    switch (status) {
        case 'orphan':
            return <Badge variant="destructive" className="text-xs">No Scenes</Badge>;
        case 'weak':
            return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Weak</Badge>;
        case 'dominant':
            return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Dominant</Badge>;
        case 'balanced':
            return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Balanced</Badge>;
    }
}
