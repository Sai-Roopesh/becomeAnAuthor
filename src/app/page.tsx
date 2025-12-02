'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useConfirmation } from '@/hooks/use-confirmation';
import { useRepository } from '@/hooks/use-repository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { ProjectGrid } from '@/features/dashboard/components/ProjectGrid';
import { EmptyState } from '@/features/dashboard/components/EmptyState';
import { DataManagementMenu } from '@/components/data-management/data-management-menu';

export default function Dashboard() {
  const projectRepo = useRepository<IProjectRepository>('projectRepository');
  const projects = useLiveQuery(() => projectRepo.getAll(), [projectRepo]);
  const { confirm, ConfirmationDialog } = useConfirmation();

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
      <div className="flex justify-end mb-4">
        <DataManagementMenu />
      </div>

      <DashboardHeader />

      {!hasProjects ? (
        <EmptyState />
      ) : (
        <ProjectGrid projects={projects} onDeleteProject={handleDeleteProject} />
      )}

      <ConfirmationDialog />
    </div>
  );
}
