"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useRepository } from "@/hooks/use-repository";
import type { IProjectRepository } from "@/domain/repositories/IProjectRepository";
import type { ISeriesRepository } from "@/domain/repositories/ISeriesRepository";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { ProjectGrid } from "@/features/dashboard/components/ProjectGrid";
import { EmptyState } from "@/features/dashboard/components/EmptyState";
import {
  DataManagementMenu,
  RestoreProjectDialog,
} from "@/features/data-management";
import { SeriesList } from "@/features/series";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { BookOpen, Library, FileDown } from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import { CreateProjectDialog } from "@/features/project";
import { ExportDialog } from "@/features/export";

export default function Dashboard() {
  const projectRepo = useRepository<IProjectRepository>("projectRepository");
  const seriesRepo = useRepository<ISeriesRepository>("seriesRepository");
  const projects = useLiveQuery(() => projectRepo.getAll(), [projectRepo]);
  const series = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo]);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const [viewMode, setViewMode] = useState<"projects" | "series">("projects");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProjectId, setExportProjectId] = useState<string | null>(null);

  // Create a map of seriesId -> series title for quick lookups
  const seriesMap = useMemo(() => {
    if (!series) return new Map<string, string>();
    return new Map(series.map((s) => [s.id, s.title]));
  }, [series]);

  if (!projects) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="h-24 w-full mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const hasProjects = projects.length > 0;

  const handleDeleteProject = async (
    e: React.MouseEvent,
    projectId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirm({
      title: "Delete Project",
      description:
        "Are you sure you want to DELETE this novel? This will permanently delete all scenes, chapters, acts, and associated data. This cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await projectRepo.delete(projectId);
        toast.success("Project deleted successfully");
      } catch (error) {
        console.error("Failed to delete project:", error);
        toast.error("Failed to delete project. Please try again.");
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "projects" | "series")}
        >
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

      {viewMode === "projects" ? (
        !hasProjects ? (
          <EmptyState
            createProjectSlot={<CreateProjectDialog />}
            restoreProjectSlot={<RestoreProjectDialog />}
          />
        ) : (
          <ProjectGrid
            projects={projects}
            seriesMap={seriesMap}
            onDeleteProject={handleDeleteProject}
            createProjectSlot={<CreateProjectDialog />}
            restoreProjectSlot={<RestoreProjectDialog />}
            renderExportButton={(projectId) => (
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExportProjectId(projectId);
                  setExportDialogOpen(true);
                }}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
            )}
          />
        )
      ) : (
        <SeriesList />
      )}

      <ConfirmationDialog />

      {/* Export Dialog - rendered at root level for proper portal behavior */}
      {exportProjectId && (
        <ExportDialog
          projectId={exportProjectId}
          open={exportDialogOpen}
          onOpenChange={(open) => {
            setExportDialogOpen(open);
            if (!open) setExportProjectId(null);
          }}
        />
      )}
    </div>
  );
}
