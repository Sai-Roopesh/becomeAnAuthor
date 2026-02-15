"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  FileDown,
  Download,
  Loader2,
} from "lucide-react";
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
  const router = useRouter();
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
  const allProjects = useLiveQuery(() => projectRepo.getAll(), [projectRepo], {
    keys: "projects",
  });
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

  const activeProjects = useMemo(
    () => sortedProjects.filter((project) => !project.archived),
    [sortedProjects],
  );

  const archivedProjects = useMemo(
    () => sortedProjects.filter((project) => Boolean(project.archived)),
    [sortedProjects],
  );

  const recentSeries = useMemo(() => {
    if (!allSeries || !allProjects) return [];
    const bySeries = new Map<string, number>();
    for (const project of allProjects) {
      if (!project.seriesId) continue;
      const previous = bySeries.get(project.seriesId) ?? 0;
      bySeries.set(project.seriesId, Math.max(previous, project.updatedAt));
    }

    return [...allSeries]
      .map((series) => ({
        ...series,
        lastUpdated: bySeries.get(series.id) ?? 0,
      }))
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, 5);
  }, [allProjects, allSeries]);

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
      title: "Move Project to Trash",
      description:
        "This novel will be moved to Trash. You can restore it from Trash before it is permanently removed.",
      confirmText: "Move to Trash",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await projectRepo.delete(projectId);
      toast.success("Project moved to Trash");
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project. Please try again.");
    }
  };

  const handleOpenExport = (projectId: string) => {
    const project = sortedProjects.find((p) => p.id === projectId) as
      | ((typeof sortedProjects)[number] & { _tauriPath?: string })
      | undefined;

    if (project?._tauriPath) {
      TauriNodeRepository.getInstance().setProjectPath(project._tauriPath);
    }

    setExportProjectId(projectId);
    setExportDialogOpen(true);
  };

  const handleRestoreProject = async (projectId: string) => {
    try {
      await projectRepo.update(projectId, { archived: false });
      toast.success("Novel restored");
    } catch (error) {
      console.error("Failed to restore project:", error);
      toast.error("Failed to restore project");
    }
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
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        <div className="w-full max-w-xl rounded-xl border bg-card p-6 space-y-5">
          <h2 className="text-xl font-semibold">No Series Selected</h2>
          <p>
            Select a recent series, create a new one, or return to the
            dashboard.
          </p>

          {recentSeries.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Recent Series
              </p>
              <div className="space-y-2">
                {recentSeries.map((series) => (
                  <button
                    key={series.id}
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(`/series?id=${series.id}`)}
                  >
                    <p className="font-medium text-foreground truncate">
                      {series.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {series.lastUpdated > 0
                        ? `Updated ${new Date(series.lastUpdated).toLocaleDateString()}`
                        : "No novels yet"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href="/">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Series
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!allSeries || !projects) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        Loading series...
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        <div className="w-full max-w-xl rounded-xl border bg-card p-6 space-y-5">
          <h2 className="text-xl font-semibold">Series Not Found</h2>
          <p>
            This series may have been removed. Pick a recent one or go back.
          </p>
          {recentSeries.length > 0 && (
            <div className="space-y-2">
              {recentSeries.map((item) => (
                <button
                  key={item.id}
                  className="w-full rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/series?id=${item.id}`)}
                >
                  <p className="font-medium text-foreground truncate">
                    {item.title}
                  </p>
                </button>
              ))}
            </div>
          )}
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-[100dvh]">
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
              <h1 className="text-2xl font-heading font-bold">
                {series.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeProjects.length === 1
                  ? "1 active novel in this series"
                  : `${activeProjects.length} active novels in this series`}
                {archivedProjects.length > 0
                  ? ` • ${archivedProjects.length} archived`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          <Button
            variant="outline"
            onClick={handleExportSeriesBackup}
            disabled={isExportingSeries}
            className="w-full sm:w-auto"
          >
            {isExportingSeries ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExportingSeries ? "Exporting..." : "Export Series Backup"}
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Novel
          </Button>
        </div>
      </div>

      {activeProjects.length === 0 ? (
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
          projects={activeProjects}
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

      {archivedProjects.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-lg font-semibold">Archived Novels</h3>
          <div className="space-y-2">
            {archivedProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{project.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Archived novel • {project.seriesIndex}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestoreProject(project.id)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
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
    <div className="flex min-h-[100dvh] items-center justify-center">
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
