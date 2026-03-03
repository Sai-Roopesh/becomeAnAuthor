"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Download, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useProjectRepository } from "@/hooks/use-project-repository";
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { useGoogleAuth } from "@/features/google-drive/hooks/use-google-auth";
import { InlineGoogleAuth } from "@/features/google-drive/components/InlineGoogleAuth";
import { DriveBackupBrowser } from "@/features/google-drive/components/DriveBackupBrowser";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";
import {
  showOpenDialog,
  showSaveDialog,
  type BackupImportResult,
  type BackupPackageInfo,
} from "@/core/tauri/commands";
import {
  APP_PREF_KEYS,
  getAppPreference,
  setAppPreference,
} from "@/core/state/app-state";

const log = logger.scope("BackupCenterPanel");

function slugifyTitle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type BackupSource = "local" | "cloud";
type NovelTargetMode = "existing" | "new";

interface BackupCenterPanelProps {
  onCompleted?: () => void;
  className?: string;
}

export function BackupCenterPanel({
  onCompleted,
  className,
}: BackupCenterPanelProps) {
  const router = useRouter();
  const {
    exportFullAppSnapshot,
    exportSeriesArchive,
    exportNovelArchive,
    inspectPackage,
    importPackage,
    backupToGoogleDrive,
  } = useImportExport();
  const seriesRepo = useSeriesRepository();
  const projectRepo = useProjectRepository();
  const { isAuthenticated, user, signOut, refreshAuth } = useGoogleAuth();

  const allSeries = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo], {
    keys: ["series", "projects"],
  });
  const allProjects = useLiveQuery(() => projectRepo.getAll(), [projectRepo], {
    keys: ["projects", "series"],
  });

  const [activeTab, setActiveTab] = useState<BackupSource>("local");
  const [restoreSource, setRestoreSource] = useState<BackupSource>("local");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [isSnapshotExporting, setIsSnapshotExporting] = useState(false);
  const [isPackageExporting, setIsPackageExporting] = useState(false);
  const [isCloudBackupRunning, setIsCloudBackupRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [lastBackupSource, setLastBackupSource] = useState<BackupSource | null>(
    null,
  );

  const [pendingImport, setPendingImport] = useState<{
    path: string;
    info: BackupPackageInfo;
  } | null>(null);
  const [novelTargetMode, setNovelTargetMode] =
    useState<NovelTargetMode>("existing");
  const [novelTargetSeriesId, setNovelTargetSeriesId] = useState("");
  const [novelNewSeriesTitle, setNovelNewSeriesTitle] = useState("");

  const [lastRestoreResult, setLastRestoreResult] =
    useState<BackupImportResult | null>(null);

  useEffect(() => {
    if (!allSeries || allSeries.length === 0) return;
    if (!selectedSeriesId) {
      const firstSeries = allSeries[0];
      if (firstSeries) {
        setSelectedSeriesId(firstSeries.id);
      }
    }
    if (!novelTargetSeriesId) {
      const firstSeries = allSeries[0];
      if (firstSeries) {
        setNovelTargetSeriesId(firstSeries.id);
      }
    }
  }, [allSeries, selectedSeriesId, novelTargetSeriesId]);

  useEffect(() => {
    if (!allProjects || allProjects.length === 0) return;
    if (!selectedProjectId) {
      const firstProject = allProjects[0];
      if (firstProject) {
        setSelectedProjectId(firstProject.id);
      }
    }
  }, [allProjects, selectedProjectId]);

  useEffect(() => {
    let cancelled = false;

    const loadLastBackup = async () => {
      const parsed = await getAppPreference<{
        at?: number;
        source?: BackupSource;
      }>(APP_PREF_KEYS.BACKUP_LAST_STATUS, {});
      if (cancelled) return;

      if (typeof parsed.at === "number") {
        setLastBackupAt(parsed.at);
      }
      if (parsed.source === "local" || parsed.source === "cloud") {
        setLastBackupSource(parsed.source);
      }
    };

    void loadLastBackup();
    return () => {
      cancelled = true;
    };
  }, []);

  const seriesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const series of allSeries ?? []) {
      map.set(series.id, series.title);
    }
    return map;
  }, [allSeries]);

  const selectedSeries = useMemo(
    () => (allSeries ?? []).find((series) => series.id === selectedSeriesId),
    [allSeries, selectedSeriesId],
  );

  const selectedProject = useMemo(
    () =>
      (allProjects ?? []).find((project) => project.id === selectedProjectId),
    [allProjects, selectedProjectId],
  );

  const persistBackupStatus = async (source: BackupSource) => {
    const now = Date.now();
    setLastBackupAt(now);
    setLastBackupSource(source);
    await setAppPreference(APP_PREF_KEYS.BACKUP_LAST_STATUS, {
      at: now,
      source,
    });
  };

  const handleLocalSnapshotExport = async () => {
    try {
      setIsSnapshotExporting(true);
      await exportFullAppSnapshot();
      await persistBackupStatus("local");
    } catch (error) {
      log.error("Local full snapshot export failed", error);
    } finally {
      setIsSnapshotExporting(false);
    }
  };

  const handleLocalSnapshotExportAs = async () => {
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultName = `full_snapshot_${date}.baa`;

    const outputPath = await showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: "Backup Package", extensions: ["baa"] }],
      title: "Choose Snapshot Destination",
    });

    if (!outputPath) {
      toast.info("Backup export cancelled");
      return;
    }

    try {
      setIsSnapshotExporting(true);
      await exportFullAppSnapshot(outputPath);
      await persistBackupStatus("local");
    } catch (error) {
      log.error(
        "Local full snapshot export (custom destination) failed",
        error,
      );
    } finally {
      setIsSnapshotExporting(false);
    }
  };

  const handleSeriesPackageExport = async () => {
    if (!selectedSeriesId) {
      toast.error("Choose a series to export");
      return;
    }

    const seriesTitle = selectedSeries?.title || "series";
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultName = `${slugifyTitle(seriesTitle)}_series_package_${date}.baa`;

    const outputPath = await showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: "Series Package", extensions: ["baa"] }],
      title: "Export Series Package",
    });

    if (!outputPath) {
      toast.info("Series package export cancelled");
      return;
    }

    try {
      setIsPackageExporting(true);
      await exportSeriesArchive(selectedSeriesId, outputPath);
    } catch (error) {
      log.error("Series package export failed", error);
    } finally {
      setIsPackageExporting(false);
    }
  };

  const handleNovelPackageExport = async () => {
    if (!selectedProjectId) {
      toast.error("Choose a novel to export");
      return;
    }

    const projectTitle = selectedProject?.title || "novel";
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultName = `${slugifyTitle(projectTitle)}_novel_package_${date}.baa`;

    const outputPath = await showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: "Novel Package", extensions: ["baa"] }],
      title: "Export Novel Package",
    });

    if (!outputPath) {
      toast.info("Novel package export cancelled");
      return;
    }

    try {
      setIsPackageExporting(true);
      await exportNovelArchive(selectedProjectId, outputPath);
    } catch (error) {
      log.error("Novel package export failed", error);
    } finally {
      setIsPackageExporting(false);
    }
  };

  const handleCloudBackup = async () => {
    try {
      setIsCloudBackupRunning(true);
      const result = await backupToGoogleDrive();
      if (result) {
        await persistBackupStatus("cloud");
      }
    } catch (error) {
      log.error("Cloud backup failed", error);
    } finally {
      setIsCloudBackupRunning(false);
    }
  };

  const handleCloudSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      toast.success("Disconnected Google Drive");
    } catch (error) {
      log.error("Google Drive sign-out failed", error);
      toast.error("Failed to disconnect Google Drive");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSelectLocalPackage = async () => {
    const selection = await showOpenDialog({
      title: "Select Backup Package",
      filters: [{ name: "Backup Package", extensions: ["baa"] }],
      multiple: false,
    });

    if (!selection || Array.isArray(selection)) {
      return;
    }

    try {
      setIsImporting(true);
      const info = await inspectPackage(selection);
      setPendingImport({ path: selection, info });
      setLastRestoreResult(null);

      if (info.kind === "novel_package") {
        setNovelTargetMode("existing");
        if (!novelTargetSeriesId && (allSeries ?? []).length > 0) {
          setNovelTargetSeriesId((allSeries ?? [])[0]!.id);
        }
      }
    } catch (error) {
      log.error("Package inspection failed", error);
      toast.error("Failed to inspect backup package");
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) {
      return;
    }

    const options: { targetSeriesId?: string; createSeriesTitle?: string } = {};

    if (pendingImport.info.kind === "novel_package") {
      if (novelTargetMode === "existing") {
        if (!novelTargetSeriesId) {
          toast.error("Choose a target series for novel import");
          return;
        }
        options.targetSeriesId = novelTargetSeriesId;
      } else {
        const title = novelNewSeriesTitle.trim();
        if (!title) {
          toast.error("Enter a title for the new target series");
          return;
        }
        options.createSeriesTitle = title;
      }
    }

    try {
      setIsImporting(true);
      const result = await importPackage(
        pendingImport.path,
        pendingImport.info.kind === "novel_package" ? options : undefined,
      );

      invalidateQueries(["projects", "series", "nodes"]);
      setLastRestoreResult(result);
      setPendingImport(null);

      if (result.requiresRelaunch) {
        toast.info("Restore complete. Relaunching app...");
        try {
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
        } catch (error) {
          log.warn("App relaunch after restore failed", { error });
          toast.info("Please relaunch the app to complete restore.");
        }
        return;
      }
    } catch (error) {
      log.error("Package import failed", error);
    } finally {
      setIsImporting(false);
    }
  };

  const openRestoredSeries = () => {
    if (!lastRestoreResult?.importedSeriesId) return;
    router.push(`/series?id=${lastRestoreResult.importedSeriesId}`);
    onCompleted?.();
  };

  const openRestoredProject = () => {
    const projectId = lastRestoreResult?.importedProjectIds?.[0];
    if (!projectId) return;
    router.push(`/project?id=${projectId}`);
    onCompleted?.();
  };

  const busy =
    isSnapshotExporting ||
    isPackageExporting ||
    isCloudBackupRunning ||
    isImporting ||
    isSigningOut;

  return (
    <div className={className}>
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
          {isAuthenticated && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Connected as {user?.name || user?.email || "Google account"}
            </p>
          )}
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloudSignOut}
              disabled={isSigningOut}
              className="mt-2"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect Google Drive"
              )}
            </Button>
          )}
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as BackupSource)}
      >
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="local">Local Snapshot</TabsTrigger>
          <TabsTrigger value="cloud">Cloud Snapshot</TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="space-y-4">
          <Card className="p-4 space-y-3">
            <Button
              onClick={handleLocalSnapshotExport}
              disabled={busy}
              className="w-full"
            >
              {isSnapshotExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isSnapshotExporting
                ? "Exporting snapshot..."
                : "Create Full Snapshot (.baa)"}
            </Button>
            <Button
              variant="outline"
              onClick={handleLocalSnapshotExportAs}
              disabled={busy}
              className="w-full"
            >
              Choose Destination...
            </Button>

            <p className="text-xs text-muted-foreground">
              Creates a full app snapshot (SQLite + Projects + Trash). Secrets
              and generated export artifacts are excluded.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="cloud" className="space-y-4">
          {!isAuthenticated ? (
            <InlineGoogleAuth onAuthComplete={() => void refreshAuth()} />
          ) : (
            <Card className="p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Connected account</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.name || user?.email || "Google account"}
                </p>
              </div>

              <Button
                onClick={handleCloudBackup}
                disabled={busy}
                className="w-full"
              >
                {isCloudBackupRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                {isCloudBackupRunning
                  ? "Uploading to Google Drive..."
                  : "Backup Full Snapshot to Google Drive"}
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card className="p-4 mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Export Package (.baa)</p>
          <p className="text-xs text-muted-foreground">
            Share or migrate specific writing data without full app restore.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Series Package (series + all novels + full codex graph)</Label>
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
            onClick={handleSeriesPackageExport}
            disabled={!selectedSeriesId || busy}
            className="w-full"
          >
            {isPackageExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Series Package (.baa)
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Novel Package (single novel + referenced codex subset)</Label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
            disabled={(allProjects ?? []).length === 0 || busy}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a novel" />
            </SelectTrigger>
            <SelectContent>
              {(allProjects ?? []).map((project) => {
                const seriesTitle =
                  seriesById.get(project.seriesId) || "Series";
                return (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title} ({seriesTitle})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            onClick={handleNovelPackageExport}
            disabled={!selectedProjectId || busy}
            className="w-full"
          >
            {isPackageExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Novel Package (.baa)
          </Button>
        </div>
      </Card>

      <Card className="p-4 mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Import Package</p>
          <p className="text-xs text-muted-foreground">
            `.baa` only. The package is inspected before import.
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
          <>
            <Button
              variant="outline"
              onClick={handleSelectLocalPackage}
              disabled={busy}
              className="w-full"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isImporting
                ? "Inspecting package..."
                : "Choose Backup Package (.baa)"}
            </Button>

            {pendingImport && (
              <Card className="p-3 space-y-3 border-primary/40 bg-primary/5">
                <div>
                  <p className="text-sm font-medium">Package ready to import</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {pendingImport.path}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Kind: {pendingImport.info.kind}</p>
                  <p>
                    Created:{" "}
                    {new Date(pendingImport.info.createdAt).toLocaleString()}
                  </p>
                  <p>
                    Includes: {pendingImport.info.counts.projects} novel
                    {pendingImport.info.counts.projects === 1 ? "" : "s"},{" "}
                    {pendingImport.info.counts.codexEntries} codex entries
                  </p>
                </div>

                {pendingImport.info.kind === "novel_package" && (
                  <div className="space-y-2">
                    <Label>Target series for imported novel</Label>
                    <RadioGroup
                      value={novelTargetMode}
                      onValueChange={(value) =>
                        setNovelTargetMode(value as NovelTargetMode)
                      }
                      className="grid grid-cols-2 gap-2"
                    >
                      <label className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer">
                        <RadioGroupItem
                          value="existing"
                          id="novel-target-existing"
                        />
                        <span className="text-sm">Existing series</span>
                      </label>
                      <label className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer">
                        <RadioGroupItem value="new" id="novel-target-new" />
                        <span className="text-sm">Create new</span>
                      </label>
                    </RadioGroup>

                    {novelTargetMode === "existing" ? (
                      <Select
                        value={novelTargetSeriesId}
                        onValueChange={setNovelTargetSeriesId}
                        disabled={(allSeries ?? []).length === 0 || busy}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target series" />
                        </SelectTrigger>
                        <SelectContent>
                          {(allSeries ?? []).map((series) => (
                            <SelectItem key={series.id} value={series.id}>
                              {series.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={novelNewSeriesTitle}
                        onChange={(event) =>
                          setNovelNewSeriesTitle(event.target.value)
                        }
                        placeholder="New series title"
                        disabled={busy}
                      />
                    )}
                  </div>
                )}

                {pendingImport.info.kind === "full_snapshot" && (
                  <p className="text-xs text-destructive">
                    Full snapshot restore replaces current app data. A
                    pre-restore checkpoint is created automatically, and the app
                    will relaunch immediately after restore.
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleConfirmImport}
                    disabled={busy}
                    className="sm:flex-1"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Import Package
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPendingImport(null)}
                    disabled={busy}
                    className="sm:flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </>
        ) : !isAuthenticated ? (
          <Card className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect Google Drive in the Cloud Snapshot tab before restoring
              from cloud.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setActiveTab("cloud")}
            >
              Go to Cloud Snapshot
            </Button>
          </Card>
        ) : (
          <DriveBackupBrowser
            onRestore={async (result) => {
              invalidateQueries(["projects", "series", "nodes"]);
              setLastRestoreResult(result);

              if (result.requiresRelaunch) {
                toast.info("Restore complete. Relaunching app...");
                try {
                  const { relaunch } =
                    await import("@tauri-apps/plugin-process");
                  await relaunch();
                } catch (error) {
                  log.warn("App relaunch after cloud restore failed", {
                    error,
                  });
                  toast.info("Please relaunch the app to complete restore.");
                }
              }
            }}
          />
        )}

        {lastRestoreResult && !lastRestoreResult.replacedAppData && (
          <Card className="p-3 space-y-3 border-primary/40 bg-primary/5">
            <p className="text-sm font-medium text-foreground">
              Import complete: {lastRestoreResult.kind}
            </p>
            <p className="text-xs text-muted-foreground">
              Imported {lastRestoreResult.importedProjectIds.length} novel
              {lastRestoreResult.importedProjectIds.length === 1 ? "" : "s"}.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={openRestoredSeries}
                className="sm:flex-1"
                disabled={!lastRestoreResult.importedSeriesId}
              >
                Open Imported Series
              </Button>
              <Button
                variant="outline"
                onClick={openRestoredProject}
                disabled={!lastRestoreResult.importedProjectIds?.[0]}
                className="sm:flex-1"
              >
                Open First Novel
              </Button>
            </div>
          </Card>
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
