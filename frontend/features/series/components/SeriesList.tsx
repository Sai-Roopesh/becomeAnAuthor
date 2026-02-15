'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useSeriesRepository } from '@/hooks/use-series-repository';
import { useProjectRepository } from '@/hooks/use-project-repository';
import { SeriesCard } from './SeriesCard';
import { CreateSeriesDialog } from './CreateSeriesDialog';
import { Button } from '@/components/ui/button';
import { Plus, Library } from 'lucide-react';

interface SeriesListProps {
    onSeriesCreated?: (seriesId: string) => void;
}

export function SeriesList({ onSeriesCreated }: SeriesListProps) {
    const router = useRouter();
    const seriesRepo = useSeriesRepository();
    const projectRepo = useProjectRepository();
    const [showCreateDialog, setShowCreateDialog] = React.useState(false);
    const handleSeriesCreated = (seriesId: string) => {
        if (onSeriesCreated) {
            onSeriesCreated(seriesId);
            return;
        }
        router.push(`/series?id=${seriesId}`);
    };

    const series = useLiveQuery(
        () => seriesRepo.getAll(),
        [seriesRepo]
    );

    const projects = useLiveQuery(
        () => projectRepo.getAll(),
        [projectRepo]
    );

    if (!series || !projects) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-pulse text-muted-foreground">Loading series...</div>
            </div>
        );
    }

    if (series.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <Library className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Series Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    Create a series to organize related books together, like trilogies or multi-book sagas.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Series
                </Button>
                <CreateSeriesDialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                    onCreated={handleSeriesCreated}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Series</h2>
                    <p className="text-muted-foreground">
                        {series.length} series • {projects.filter(p => p.seriesId).length} books in series • Click a series to open
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Series
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {series.map(s => {
                    const seriesProjects = projects
                        .filter(p => p.seriesId === s.id)
                        .sort((a, b) => {
                            const aIdx = parseInt(a.seriesIndex?.match(/\d+/)?.[0] || '0');
                            const bIdx = parseInt(b.seriesIndex?.match(/\d+/)?.[0] || '0');
                            return aIdx - bIdx;
                        });

                    return (
                        <SeriesCard
                            key={s.id}
                            series={s}
                            projects={seriesProjects}
                        />
                    );
                })}
            </div>

            <CreateSeriesDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onCreated={handleSeriesCreated}
            />
        </div>
    );
}
