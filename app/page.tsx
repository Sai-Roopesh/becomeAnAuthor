'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useConfirmation } from '@/hooks/use-confirmation';
import { useRepository } from '@/hooks/use-repository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import type { ISeriesRepository } from '@/domain/repositories/ISeriesRepository';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { ProjectGrid } from '@/features/dashboard/components/ProjectGrid';
import { EmptyState } from '@/features/dashboard/components/EmptyState';
import { DataManagementMenu } from '@/components/data-management/data-management-menu';
import { SeriesList } from '@/features/series';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Library } from 'lucide-react';

export default function Dashboard() {
  const projectRepo = useRepository<IProjectRepository>('projectRepository');
  const seriesRepo = useRepository<ISeriesRepository>('seriesRepository');
  const projects = useLiveQuery(() => projectRepo.getAll(), [projectRepo]);
  const series = useLiveQuery(() => seriesRepo.list(), [seriesRepo]);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const [viewMode, setViewMode] = useState<'projects' | 'series'>('projects');

  // Create a map of seriesId -> series title for quick lookups
  const seriesMap = useMemo(() => {
    if (!series) return new Map<string, string>();
    return new Map(series.map(s => [s.id, s.title]));
  }, [series]);

  if (!projects) return null;

  const hasProjects = projects.length > 0;

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Delete Project',
      description: 'Are you sure you want to DELETE this novel? This will permanently delete all scenes, chapters, acts, and associated data. This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive'
    });

    if (confirmed) {
      await projectRepo.delete(projectId);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'projects' | 'series')}>
          <TabsList>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="series" className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Series
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <DataManagementMenu />
      </div>

      <DashboardHeader />

      {viewMode === 'projects' ? (
        !hasProjects ? (
          <EmptyState />
        ) : (
          <ProjectGrid
            projects={projects}
            seriesMap={seriesMap}
            onDeleteProject={handleDeleteProject}
          />
        )
      ) : (
        <SeriesList />
      )}

      <ConfirmationDialog />
    </div>
  );
}
