"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOpenProject } from "@/hooks/use-open-project";
import { useProjectRepository } from "@/hooks/use-project-repository";
import { invalidateQueries, useLiveQuery } from "@/hooks/use-live-query";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { ErrorBoundary } from "@/features/shared/components";
import { BackupCenterDialog } from "@/features/data-management";
import { CreateSeriesDialog, SeriesList } from "@/features/series";
import {
  listDeletedSeries,
  permanentlyDeleteDeletedSeries,
  restoreDeletedSeries,
} from "@/core/tauri";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Loader2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "@/shared/utils/toast-service";

export default function Dashboard() {
  const router = useRouter();
  const { openFromPicker, isOpening } = useOpenProject();
  const projectRepo = useProjectRepository();
  const [createSeriesDialogOpen, setCreateSeriesDialogOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const trashedProjects = useLiveQuery(
    () => projectRepo.listTrash(),
    [projectRepo],
    {
      keys: "projects",
    },
  );
  const deletedSeries = useLiveQuery(() => listDeletedSeries(), [], {
    keys: "series",
  });

  const handleOpenNovel = async () => {
    const project = await openFromPicker();
    if (project) {
      router.push(`/project?id=${project.id}`);
      toast.success(`Opened "${project.title}"`);
    }
  };

  const handleRestoreFromTrash = async (trashPath: string) => {
    try {
      const restoredId = await projectRepo.restoreFromTrash(trashPath);
      toast.success("Project restored from Trash");
      router.push(`/project?id=${restoredId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore project";
      toast.error(message);
    }
  };

  const handlePermanentDelete = async (trashPath: string, title: string) => {
    const confirmed = window.confirm(
      `Permanently delete \"${title}\" from Trash? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await projectRepo.permanentlyDeleteFromTrash(trashPath);
      toast.success("Project permanently deleted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete project";
      toast.error(message);
    }
  };

  const handleRestoreSeries = async (oldSeriesId: string) => {
    try {
      const restored = await restoreDeletedSeries(oldSeriesId);
      invalidateQueries(["series", "projects"]);
      toast.success(`Series "${restored.title}" restored`);
      router.push(`/series?id=${restored.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore series";
      toast.error(message);
    }
  };

  const handleDeleteSeriesRecord = async (
    oldSeriesId: string,
    title: string,
  ) => {
    const confirmed = window.confirm(
      `Permanently remove deleted series record "${title}" from Trash? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await permanentlyDeleteDeletedSeries(oldSeriesId);
      invalidateQueries("series");
      toast.success(`Deleted "${title}" from Trash`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete series record";
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold">Series</h2>

        <div className="flex flex-wrap items-center gap-2 justify-center md:justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateSeriesDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Series
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
          <BackupCenterDialog
            trigger={
              <Button variant="outline" size="sm">
                Backup Center
              </Button>
            }
          />
        </div>
      </div>

      <DashboardHeader />

      {((trashedProjects ?? []).length > 0 ||
        (deletedSeries ?? []).length > 0) && (
        <div className="mb-6 rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Trash</h3>
              <p className="text-sm text-muted-foreground">
                Restore novels and series, or permanently delete novels.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTrash((v) => !v)}
            >
              {showTrash ? "Hide" : "Show"} Trash
            </Button>
          </div>

          {showTrash && (
            <div className="space-y-2">
              {(deletedSeries ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Deleted Series
                  </p>
                  {(deletedSeries ?? []).map((series) => (
                    <div
                      key={series.oldSeriesId}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-lg px-3 py-2 gap-2"
                    >
                      <div className="min-w-0 w-full">
                        <p className="font-medium truncate">{series.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Deleted {new Date(series.deletedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleRestoreSeries(series.oldSeriesId)
                          }
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore Series
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDeleteSeriesRecord(
                              series.oldSeriesId,
                              series.title,
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete Forever
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(trashedProjects ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Deleted Novels
                  </p>
                  {(trashedProjects ?? []).map((project) => (
                    <div
                      key={project.trashPath}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-lg px-3 py-2 gap-2"
                    >
                      <div className="min-w-0 w-full">
                        <p className="font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Deleted {new Date(project.deletedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleRestoreFromTrash(project.trashPath)
                          }
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handlePermanentDelete(
                              project.trashPath,
                              project.title,
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete Forever
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(deletedSeries ?? []).length === 0 &&
                (trashedProjects ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground border rounded-lg px-3 py-2">
                    Trash is empty.
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      <ErrorBoundary name="Series List" maxRetries={3}>
        <SeriesList
          onSeriesCreated={(seriesId) => router.push(`/series?id=${seriesId}`)}
        />
      </ErrorBoundary>

      <CreateSeriesDialog
        open={createSeriesDialogOpen}
        onOpenChange={setCreateSeriesDialogOpen}
        onCreated={(seriesId) => router.push(`/series?id=${seriesId}`)}
      />
    </div>
  );
}
