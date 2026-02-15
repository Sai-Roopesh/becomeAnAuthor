"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cloud, Download, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useImportExport } from "@/hooks/use-import-export";
import { useSeriesRepository } from "@/hooks/use-series-repository";
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { useGoogleAuth } from "@/features/google-drive/hooks/use-google-auth";
import { InlineGoogleAuth } from "@/features/google-drive/components/InlineGoogleAuth";
import { DriveBackupBrowser } from "@/features/google-drive/components/DriveBackupBrowser";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("BackupCenterPanel");
const LAST_BACKUP_KEY = "baa.lastBackup";

type BackupSource = "local" | "cloud";

interface BackupCenterPanelProps {
  onCompleted?: () => void;
  className?: string;
}

export function BackupCenterPanel({
  onCompleted,
  className,
}: BackupCenterPanelProps) {
  const { exportSeries, importSeries, backupToGoogleDrive } = useImportExport();
  const seriesRepo = useSeriesRepository();
  const { isAuthenticated } = useGoogleAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const allSeries = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo], {
    keys: ["series", "projects"],
  });

  const [activeTab, setActiveTab] = useState<BackupSource>("local");
  const [restoreSource, setRestoreSource] = useState<BackupSource>("local");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isCloudBackupRunning, setIsCloudBackupRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [lastBackupSource, setLastBackupSource] = useState<BackupSource | null>(
    null,
  );

  useEffect(() => {
    if (!allSeries || allSeries.length === 0) return;
    if (!selectedSeriesId) {
      const firstSeries = allSeries[0];
      if (firstSeries) {
        setSelectedSeriesId(firstSeries.id);
      }
    }
  }, [allSeries, selectedSeriesId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_BACKUP_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { at: number; source: BackupSource };
      if (typeof parsed.at === "number") {
        setLastBackupAt(parsed.at);
      }
      if (parsed.source === "local" || parsed.source === "cloud") {
        setLastBackupSource(parsed.source);
      }
    } catch {
      // Ignore bad persisted values
    }
  }, []);

  const selectedSeries = useMemo(
    () => (allSeries ?? []).find((series) => series.id === selectedSeriesId),
    [allSeries, selectedSeriesId],
  );

  const persistBackupStatus = (source: BackupSource) => {
    const now = Date.now();
    setLastBackupAt(now);
    setLastBackupSource(source);
    localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify({ at: now, source }));
  };

  const handleLocalExport = async () => {
    if (!selectedSeriesId) {
      toast.error("Choose a series to export");
      return;
    }

    try {
      setIsExporting(true);
      await exportSeries(selectedSeriesId);
      persistBackupStatus("local");
    } catch (error) {
      log.error("Local backup export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!selectedSeriesId) {
      toast.error("Choose a series to back up");
      return;
    }

    try {
      setIsCloudBackupRunning(true);
      const result = await backupToGoogleDrive(selectedSeriesId);
      if (result) {
        persistBackupStatus("cloud");
      }
    } catch (error) {
      log.error("Cloud backup failed", error);
    } finally {
      setIsCloudBackupRunning(false);
    }
  };

  const handleLocalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importSeries(file);
      invalidateQueries(["projects", "series", "nodes"]);
      toast.success(
        `Restored "${result.seriesTitle}" with ${result.importedProjectCount} novel${result.importedProjectCount === 1 ? "" : "s"}`,
      );
      onCompleted?.();
    } catch (error) {
      log.error("Local restore failed", error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const busy = isExporting || isCloudBackupRunning || isImporting;

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleLocalImport}
        disabled={busy}
      />

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <Card className="p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Status
          </p>
          <p className="text-sm mt-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {lastBackupAt
              ? `Last backup: ${new Date(lastBackupAt).toLocaleString()}`
              : "No backup yet"}
          </p>
          {lastBackupSource && (
            <p className="text-xs text-muted-foreground mt-1">
              Source:{" "}
              {lastBackupSource === "local" ? "Local file" : "Google Drive"}
            </p>
          )}
        </Card>

        <Card className="p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Cloud
          </p>
          <p className="text-sm mt-1 flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            {isAuthenticated
              ? "Google Drive connected"
              : "Google Drive not connected"}
          </p>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as BackupSource)}
      >
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="local">Local Backup</TabsTrigger>
          <TabsTrigger value="cloud">Cloud Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="space-y-4">
          <Card className="p-4 space-y-3">
            <Label>Series to back up</Label>
            <Select
              value={selectedSeriesId}
              onValueChange={setSelectedSeriesId}
              disabled={(allSeries ?? []).length === 0 || busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a series" />
              </SelectTrigger>
              <SelectContent>
                {(allSeries ?? []).map((series) => (
                  <SelectItem key={series.id} value={series.id}>
                    {series.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleLocalExport}
              disabled={!selectedSeriesId || busy}
              className="w-full"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? "Exporting backup..." : "Export Backup (.json)"}
            </Button>

            <p className="text-xs text-muted-foreground">
              Creates a full series backup with novels, structure, codex, and
              snippets.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="cloud" className="space-y-4">
          {!isAuthenticated ? (
            <InlineGoogleAuth onAuthComplete={() => void 0} />
          ) : (
            <Card className="p-4 space-y-3">
              <Label>Series to back up</Label>
              <Select
                value={selectedSeriesId}
                onValueChange={setSelectedSeriesId}
                disabled={(allSeries ?? []).length === 0 || busy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a series" />
                </SelectTrigger>
                <SelectContent>
                  {(allSeries ?? []).map((series) => (
                    <SelectItem key={series.id} value={series.id}>
                      {series.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleCloudBackup}
                disabled={!selectedSeriesId || busy}
                className="w-full"
              >
                {isCloudBackupRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                {isCloudBackupRunning
                  ? "Uploading to Google Drive..."
                  : "Backup to Google Drive"}
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card className="p-4 mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Restore Wizard</p>
          <p className="text-xs text-muted-foreground">
            Choose where the backup lives, then restore it.
          </p>
        </div>

        <RadioGroup
          value={restoreSource}
          onValueChange={(value) => setRestoreSource(value as BackupSource)}
          className="grid grid-cols-2 gap-2"
        >
          <label className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer">
            <RadioGroupItem value="local" id="restore-local" />
            <span className="text-sm">Local File</span>
          </label>
          <label className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer">
            <RadioGroupItem value="cloud" id="restore-cloud" />
            <span className="text-sm">Google Drive</span>
          </label>
        </RadioGroup>

        {restoreSource === "local" ? (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="w-full"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isImporting ? "Restoring..." : "Choose Backup File (.json)"}
          </Button>
        ) : !isAuthenticated ? (
          <InlineGoogleAuth onAuthComplete={() => void 0} />
        ) : (
          <DriveBackupBrowser
            onRestore={() => {
              invalidateQueries(["projects", "series", "nodes"]);
              onCompleted?.();
            }}
          />
        )}
      </Card>

      {selectedSeries && (
        <p className="text-xs text-muted-foreground mt-3">
          Selected series: {selectedSeries.title}
        </p>
      )}
    </div>
  );
}
