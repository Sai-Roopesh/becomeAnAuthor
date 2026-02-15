"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOpenProject } from "@/hooks/use-open-project";
import { useProjectRepository } from "@/hooks/use-project-repository";
import { useLiveQuery } from "@/hooks/use-live-query";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { ErrorBoundary } from "@/features/shared/components";
import { BackupCenterDialog } from "@/features/data-management";
import { CreateSeriesDialog, SeriesList } from "@/features/series";
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

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Series</h2>

        <div className="flex items-center gap-2">
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

      {(trashedProjects ?? []).length > 0 && (
        <div className="mb-6 rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Trash</h3>
              <p className="text-sm text-muted-foreground">
                Restore projects or permanently delete them.
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
              {(trashedProjects ?? []).map((project) => (
                <div
                  key={project.trashPath}
                  className="flex items-center justify-between border rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{project.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Deleted {new Date(project.deletedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreFromTrash(project.trashPath)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handlePermanentDelete(project.trashPath, project.title)
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
