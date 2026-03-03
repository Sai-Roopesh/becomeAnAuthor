/**
 * Import/Export Hook (.baa package format)
 *
 * - full_snapshot: backup/disaster recovery
 * - series_package: share/migrate one series
 * - novel_package: share/migrate one novel
 */
import { toast } from "@/shared/utils/toast-service";
import { googleAuthService } from "@/infrastructure/services/google-auth-service";
import { googleDriveService } from "@/infrastructure/services/google-drive-service";
import {
  exportFullSnapshot,
  exportNovelPackage,
  exportSeriesPackage,
  importBackupPackage,
  inspectBackupPackage,
  readFileBytes,
  writeTempBackupFile,
  type BackupImportOptions,
  type BackupImportResult,
  type BackupPackageInfo,
  type BackupPackageSummary,
} from "@/core/tauri/commands";
import type { DriveFile } from "@/domain/entities/types";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ImportExport");

export function useImportExport() {
  const exportFullAppSnapshot = async (
    outputPath?: string | null,
  ): Promise<BackupPackageSummary> => {
    try {
      const summary = await exportFullSnapshot(outputPath ?? null);
      toast.success(`Full snapshot exported to ${summary.path}`);
      return summary;
    } catch (error) {
      log.error("Full snapshot export failed", error);
      toast.error("Failed to export full snapshot.");
      throw error;
    }
  };

  const exportSeriesArchive = async (
    seriesId: string,
    outputPath?: string | null,
  ): Promise<BackupPackageSummary> => {
    if (!seriesId) {
      throw new Error("Series ID is required.");
    }

    try {
      const summary = await exportSeriesPackage(seriesId, outputPath ?? null);
      toast.success(`Series package exported to ${summary.path}`);
      return summary;
    } catch (error) {
      log.error("Series package export failed", error);
      toast.error("Failed to export series package.");
      throw error;
    }
  };

  const exportNovelArchive = async (
    projectId: string,
    outputPath?: string | null,
  ): Promise<BackupPackageSummary> => {
    if (!projectId) {
      throw new Error("Project ID is required.");
    }

    try {
      const summary = await exportNovelPackage(projectId, outputPath ?? null);
      toast.success(`Novel package exported to ${summary.path}`);
      return summary;
    } catch (error) {
      log.error("Novel package export failed", error);
      toast.error("Failed to export novel package.");
      throw error;
    }
  };

  const inspectPackage = async (
    packagePath: string,
  ): Promise<BackupPackageInfo> => {
    try {
      return await inspectBackupPackage(packagePath);
    } catch (error) {
      log.error("Package inspection failed", error);
      throw error;
    }
  };

  const importPackage = async (
    packagePath: string,
    options?: BackupImportOptions,
  ): Promise<BackupImportResult> => {
    try {
      const info = await inspectBackupPackage(packagePath);
      const result = await importBackupPackage(packagePath, options);

      if (result.replacedAppData) {
        toast.success(
          `Full snapshot restored.${result.checkpointPath ? ` Checkpoint saved at ${result.checkpointPath}.` : ""}`,
        );
      } else if (info.kind === "series_package") {
        toast.success(
          `Series package imported (${result.importedProjectIds.length} novel${result.importedProjectIds.length === 1 ? "" : "s"}).`,
        );
      } else {
        toast.success("Novel package imported.");
      }

      return result;
    } catch (error) {
      log.error("Package import failed", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import package.",
      );
      throw error;
    }
  };

  const backupToGoogleDrive = async (): Promise<DriveFile | null> => {
    try {
      if (!(await googleAuthService.isAuthenticated())) {
        toast.info("Please sign in with Google to backup to Drive.");
        await googleAuthService.signIn();
        if (!(await googleAuthService.isAuthenticated())) {
          return null;
        }
      }

      toast.info("Preparing full snapshot...");
      const summary = await exportFullSnapshot();
      const bytes = await readFileBytes(summary.path);

      const fileName = summary.fileName.endsWith(".baa")
        ? summary.fileName
        : `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.baa`;

      const uploaded = await googleDriveService.uploadBackupPackage(
        Uint8Array.from(bytes),
        fileName,
      );

      toast.success(`Backup saved to Google Drive: ${uploaded.name}`);
      return uploaded;
    } catch (error) {
      log.error("Google Drive backup failed", error);
      toast.error("Failed to backup to Google Drive.");
      throw error;
    }
  };

  const restoreFromGoogleDrive = async (
    fileId: string,
  ): Promise<BackupImportResult> => {
    try {
      if (!(await googleAuthService.isAuthenticated())) {
        toast.info("Please sign in with Google to restore from Drive.");
        await googleAuthService.signIn();
        if (!(await googleAuthService.isAuthenticated())) {
          throw new Error("Authentication required");
        }
      }

      toast.info("Downloading backup from Google Drive...");
      const packageBytes =
        await googleDriveService.downloadBackupPackage(fileId);
      const tempPath = await writeTempBackupFile(
        `drive_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.baa`,
        Array.from(packageBytes),
      );

      const info = await inspectBackupPackage(tempPath);
      if (info.kind !== "full_snapshot") {
        throw new Error(
          "Cloud restore only supports full snapshot packages (.baa).",
        );
      }

      const result = await importBackupPackage(tempPath);
      toast.success("Full snapshot restored from Google Drive.");
      return result;
    } catch (error) {
      log.error("Google Drive restore failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to restore from Google Drive.",
      );
      throw error;
    }
  };

  const listDriveBackups = async (): Promise<DriveFile[]> => {
    try {
      if (!(await googleAuthService.isAuthenticated())) {
        return [];
      }
      return await googleDriveService.listBackups();
    } catch (error) {
      log.error("Failed to list Drive backups", error);
      return [];
    }
  };

  return {
    exportFullAppSnapshot,
    exportSeriesArchive,
    exportNovelArchive,
    inspectPackage,
    importPackage,
    backupToGoogleDrive,
    restoreFromGoogleDrive,
    listDriveBackups,
  };
}
