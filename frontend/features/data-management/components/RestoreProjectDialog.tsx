"use client";
import { useState, useRef } from "react";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("RestoreProjectDialog");
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Cloud, Download, AlertCircle } from "lucide-react";
import { useImportExport } from "@/hooks/use-import-export";
import { useGoogleAuth } from "@/features/google-drive/hooks/use-google-auth";
import { DriveBackupBrowser } from "@/features/google-drive";
import { InlineGoogleAuth } from "@/features/google-drive";
import { toast } from "@/shared/utils/toast-service";
import { invalidateQueries } from "@/hooks/use-live-query";

interface RestoreProjectDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function RestoreProjectDialog({
  open: controlledOpen,
  onOpenChange,
  trigger,
}: RestoreProjectDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const [activeTab, setActiveTab] = useState<"local" | "drive">("local");
  const { importSeries } = useImportExport();
  const { isAuthenticated } = useGoogleAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalFileImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await importSeries(file);
        if (result.seriesId) {
          toast.success(
            `Series "${result.seriesTitle}" restored with ${result.importedProjectCount} novel${result.importedProjectCount === 1 ? "" : "s"}!`,
          );
          setOpen(false);
          invalidateQueries();
        }
      } catch (error) {
        // Error handled in hook
        log.error("Import failed:", error);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <div className="h-full cursor-pointer group">
              <Card className="h-full min-h-72 flex flex-col items-center justify-center border-dashed border-2 border-muted-foreground/20 bg-muted/5 hover:bg-muted/10 hover:border-muted-foreground/50 transition-all duration-300">
                <div className="p-4 rounded-full bg-muted/10 group-hover:bg-muted/20 group-hover:scale-110 transition-all duration-300 mb-4">
                  <Download className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-muted-foreground">
                  Restore Series
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Import a series backup file
                </p>
              </Card>
            </div>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl h-[80dvh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Restore Series</DialogTitle>
          <DialogDescription>
            Restore a full series (including novels and codex) from a backup file or Google Drive
          </DialogDescription>
        </DialogHeader>

        {/* Custom Tab Switcher */}
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={activeTab === "local" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setActiveTab("local")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Local File
            </Button>
            <Button
              variant={activeTab === "drive" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setActiveTab("drive")}
            >
              <Cloud className="h-4 w-4 mr-2" />
              Google Drive
            </Button>
          </div>
          {/* Tab Content */}
          {activeTab === "local" ? (
            <div className="space-y-4 pt-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Select Backup File</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a .json series backup file to restore your data
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleLocalFileImport}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      About Project Backups
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Series backups contain all novels in a series, scene
                      structure, codex, and snippets. Restoring creates a new
                      imported series alongside existing data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {!isAuthenticated ? (
                <InlineGoogleAuth
                  onAuthComplete={() => {
                    /* Refresh will happen automatically */
                  }}
                />
              ) : (
                <DriveBackupBrowser
                  onRestore={() => {
                    setOpen(false);
                    toast.success("Series restored from Google Drive!");
                    invalidateQueries();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
