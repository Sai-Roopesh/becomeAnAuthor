"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOpenProject } from "@/hooks/use-open-project";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { ErrorBoundary } from "@/features/shared/components";
import {
  DataManagementMenu,
  RestoreProjectDialog,
} from "@/features/data-management";
import { CreateSeriesDialog, SeriesList } from "@/features/series";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Download, Loader2 } from "lucide-react";
import { toast } from "@/shared/utils/toast-service";

export default function Dashboard() {
  const router = useRouter();
  const { openFromPicker, isOpening } = useOpenProject();
  const [createSeriesDialogOpen, setCreateSeriesDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const handleOpenNovel = async () => {
    const project = await openFromPicker();
    if (project) {
      router.push(`/project?id=${project.id}`);
      toast.success(`Opened "${project.title}"`);
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
      <RestoreProjectDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
      />
    </div>
  );
}
