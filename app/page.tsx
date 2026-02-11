"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useRepository } from "@/hooks/use-repository";
import { useOpenProject } from "@/hooks/use-open-project";
import type { IProjectRepository } from "@/domain/repositories/IProjectRepository";
import type { ISeriesRepository } from "@/domain/repositories/ISeriesRepository";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { ProjectGrid } from "@/features/dashboard/components/ProjectGrid";
import { EmptyState } from "@/features/dashboard/components/EmptyState";
import { ErrorBoundary } from "@/features/shared/components";
import {
  DataManagementMenu,
  RestoreProjectDialog,
} from "@/features/data-management";
import { SeriesList } from "@/features/series";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Library,
  FileDown,
  Plus,
  FolderOpen,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import { CreateProjectDialog } from "@/features/project";
import { ExportDialog } from "@/features/export";

export default function Dashboard() {
  const router = useRouter();
  const projectRepo = useRepository<IProjectRepository>("projectRepository");
  const seriesRepo = useRepository<ISeriesRepository>("seriesRepository");
  const projects = useLiveQuery(() => projectRepo.getAll(), [projectRepo]);
  const series = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo]);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const { openFromPicker, isOpening } = useOpenProject();
  const [viewMode, setViewMode] = useState<"projects" | "series">("projects");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProjectId, setExportProjectId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const handleOpenNovel = async () => {
    const project = await openFromPicker();
    if (project) {
      router.push(`/project?id=${project.id}`);
      toast.success(`Opened "${project.title}"`);
    }
  };

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

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Novel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenNovel}
            disabled={isOpening}
          >
            {isOpening ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FolderOpen className="w-4 h-4 mr-1" />
            )}
            {isOpening ? "Opening..." : "Open"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRestoreDialogOpen(true)}
          >
            <Download className="w-4 h-4 mr-1" />
            Restore
          </Button>
          <DataManagementMenu />
        </div>
      </div>

      <DashboardHeader />

      {viewMode === "projects" ? (
        !hasProjects ? (
          <EmptyState />
        ) : (
          <ErrorBoundary name="Project Grid" maxRetries={3}>
            <ProjectGrid
              projects={projects}
              seriesMap={seriesMap}
              onDeleteProject={handleDeleteProject}
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
          </ErrorBoundary>
        )
      ) : (
        <ErrorBoundary name="Series List" maxRetries={3}>
          <SeriesList />
        </ErrorBoundary>
      )}

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <RestoreProjectDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
      />

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
