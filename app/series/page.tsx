"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, Plus, FileDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useRepository } from "@/hooks/use-repository";
import { useConfirmation } from "@/hooks/use-confirmation";
import type { IProjectRepository } from "@/domain/repositories/IProjectRepository";
import type { ISeriesRepository } from "@/domain/repositories/ISeriesRepository";
import { ProjectGrid } from "@/features/dashboard/components/ProjectGrid";
import { CreateProjectDialog } from "@/features/project";
import { ExportDialog } from "@/features/export";
import { toast } from "@/shared/utils/toast-service";
import { TauriNodeRepository } from "@/infrastructure/repositories/TauriNodeRepository";
import { useImportExport } from "@/hooks/use-import-export";

function SeriesContent() {
  const searchParams = useSearchParams();
  const seriesId = searchParams.get("id") || "";
  const projectRepo = useRepository<IProjectRepository>("projectRepository");
  const seriesRepo = useRepository<ISeriesRepository>("seriesRepository");
  const { confirm, ConfirmationDialog } = useConfirmation();
  const { exportSeries } = useImportExport();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProjectId, setExportProjectId] = useState<string | null>(null);
  const [isExportingSeries, setIsExportingSeries] = useState(false);

  const allSeries = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo]);
  const projects = useLiveQuery(
    () => (seriesId ? projectRepo.getBySeries(seriesId) : Promise.resolve([])),
    [seriesId, projectRepo],
  );

  const series = useMemo(
    () => allSeries?.find((item) => item.id === seriesId),
    [allSeries, seriesId],
  );

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => {
      const aIdx = parseInt(a.seriesIndex?.match(/\d+/)?.[0] || "0", 10);
      const bIdx = parseInt(b.seriesIndex?.match(/\d+/)?.[0] || "0", 10);
      return aIdx - bIdx;
    });
  }, [projects]);

  const seriesMap = useMemo(() => {
    if (!series) return new Map<string, string>();
    return new Map([[series.id, series.title]]);
  }, [series]);

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

    if (!confirmed) return;

    try {
      await projectRepo.delete(projectId);
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project. Please try again.");
    }
  };

  const handleOpenExport = (projectId: string) => {
    const project = sortedProjects.find((p) => p.id === projectId) as
      | (typeof sortedProjects)[number] & { _tauriPath?: string }
      | undefined;

    if (project?._tauriPath) {
      TauriNodeRepository.getInstance().setProjectPath(project._tauriPath);
    }

    setExportProjectId(projectId);
    setExportDialogOpen(true);
  };

  const handleExportSeriesBackup = async () => {
    if (!seriesId) return;
    setIsExportingSeries(true);
    try {
      await exportSeries(seriesId);
    } finally {
      setIsExportingSeries(false);
    }
  };

  if (!seriesId) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">No Series Selected</h2>
          <p>Select a series first to create or manage novels.</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!allSeries || !projects) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading series...
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Series Not Found</h2>
          <p>This series may have been deleted.</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Series
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div className="space-y-2">
          <Link href="/" className="inline-flex">
            <Button variant="ghost" size="sm" className="gap-2 px-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">{series.title}</h1>
              <p className="text-sm text-muted-foreground">
                {sortedProjects.length === 1
                  ? "1 novel in this series"
                  : `${sortedProjects.length} novels in this series`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportSeriesBackup}
            disabled={isExportingSeries}
          >
            {isExportingSeries ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExportingSeries ? "Exporting..." : "Export Series Backup"}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Novel
          </Button>
        </div>
      </div>

      {sortedProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium mb-2">No novels yet</h3>
          <p className="text-muted-foreground mb-6">
            Create the first novel in this series to start writing.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Novel
          </Button>
        </div>
      ) : (
        <ProjectGrid
          projects={sortedProjects}
          seriesMap={seriesMap}
          onDeleteProject={handleDeleteProject}
          renderExportButton={(projectId) => (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenExport(projectId);
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export Novel
            </DropdownMenuItem>
          )}
        />
      )}

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        seriesId={series.id}
        seriesTitle={series.title}
      />
      {exportProjectId && (
        <ExportDialog
          projectId={exportProjectId}
          open={exportDialogOpen}
          onOpenChange={(open) => {
            setExportDialogOpen(open);
            if (!open) {
              setExportProjectId(null);
            }
          }}
        />
      )}
      <ConfirmationDialog />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-muted-foreground">Loading series...</div>
    </div>
  );
}

export default function SeriesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SeriesContent />
    </Suspense>
  );
}
