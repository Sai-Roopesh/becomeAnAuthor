/**
 * Import/Export Hook (Series-first)
 *
 * Backup import/export is series-scoped.
 * Individual novels should be exported as documents (PDF/DOCX/ePub), not JSON backups.
 */
import { invoke } from "@tauri-apps/api/core";
import { toast } from "@/shared/utils/toast-service";
import { ExportedSeriesSchema } from "@/shared/schemas/import-schema";
import { googleAuthService } from "@/infrastructure/services/google-auth-service";
import { googleDriveService } from "@/infrastructure/services/google-drive-service";
import {
  exportSeriesAsJson,
  importSeriesBackup,
  type ImportSeriesResult,
} from "@/core/tauri/commands";
import type { DriveFile, DriveBackupMetadata } from "@/domain/entities/types";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ImportExport");

export function useImportExport() {
  const exportFullBackup = async (seriesId: string) => {
    return exportSeries(seriesId);
  };

  const importFullBackup = async (file: File) => {
    return importSeries(file);
  };

  const exportSeries = async (
    seriesId: string,
    outputPath?: string | null,
  ): Promise<string> => {
    if (!seriesId) {
      throw new Error("Series ID is required for export.");
    }

    try {
      const backupPath = await invoke<string>("export_series_backup", {
        seriesId,
        outputPath: outputPath ?? null,
      });
      toast.success(`Series backup exported to ${backupPath}`);
      return backupPath;
    } catch (error) {
      log.error("Series export failed", error);
      toast.error("Failed to export series backup.");
      throw error;
    }
  };

  const importSeries = async (file: File): Promise<ImportSeriesResult> => {
    try {
      const fileContent = await file.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(fileContent);
      } catch {
        throw new Error("Invalid JSON file");
      }

      const validationResult = ExportedSeriesSchema.safeParse(parsedData);
      if (!validationResult.success) {
        log.error(
          "Series backup validation errors",
          validationResult.error.issues,
        );
        throw new Error("Invalid series backup file format.");
      }

      const result = await importSeriesBackup(fileContent);
      toast.success(
        `Series "${result.seriesTitle}" imported (${result.importedProjectCount} novel${result.importedProjectCount === 1 ? "" : "s"}).`,
      );
      return result;
    } catch (error) {
      log.error("Series import failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to import series backup.",
      );
      throw error;
    }
  };

  /**
   * @deprecated Novel JSON backup export is intentionally disabled.
   * Use document export (PDF/DOCX/ePub) for an individual novel.
   */
  const exportProject = async (projectId: string) => {
    void projectId;
    throw new Error(
      "Novel JSON backup export is disabled. Use manuscript export (PDF/DOCX/ePub) instead.",
    );
  };

  /**
   * Backup a series to Google Drive
   */
  const backupToGoogleDrive = async (
    seriesId: string,
  ): Promise<DriveFile | null> => {
    try {
      if (!seriesId) {
        throw new Error("Series ID is required for Drive backup.");
      }

      if (!googleAuthService.isAuthenticated()) {
        toast.info("Please sign in with Google to backup to Drive.");
        await googleAuthService.signIn();
        return null;
      }

      toast.info("Preparing series backup...");
      const backupJson = await exportSeriesAsJson(seriesId);
      const backupData = JSON.parse(backupJson) as {
        series?: { title?: string };
      };

      const seriesTitle = backupData.series?.title || "Series";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `${seriesTitle}_series_backup_${timestamp}.json`;

      const result = await googleDriveService.uploadBackup(
        backupData as unknown as DriveBackupMetadata,
        fileName,
      );

      toast.success(`Series backup saved to Google Drive: ${result.name}`);
      return result;
    } catch (error) {
      log.error("Google Drive backup failed", error);
      toast.error("Failed to backup series to Google Drive.");
      throw error;
    }
  };

  /**
   * Restore series from Google Drive backup
   */
  const restoreFromGoogleDrive = async (
    fileId: string,
  ): Promise<ImportSeriesResult> => {
    try {
      if (!googleAuthService.isAuthenticated()) {
        toast.info("Please sign in with Google to restore from Drive.");
        await googleAuthService.signIn();
        throw new Error("Authentication required");
      }

      toast.info("Downloading backup from Google Drive...");
      const backupData = await googleDriveService.downloadBackup(fileId);
      const validationResult = ExportedSeriesSchema.safeParse(backupData);
      if (!validationResult.success) {
        log.error(
          "Drive backup validation failed",
          validationResult.error.issues,
        );
        throw new Error("Invalid series backup file.");
      }

      const result = await importSeriesBackup(JSON.stringify(backupData));
      toast.success(
        `Series "${result.seriesTitle}" restored from Google Drive (${result.importedProjectCount} novel${result.importedProjectCount === 1 ? "" : "s"}).`,
      );
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
      if (!googleAuthService.isAuthenticated()) {
        return [];
      }
      return await googleDriveService.listBackups();
    } catch (error) {
      log.error("Failed to list Drive backups", error);
      return [];
    }
  };

  return {
    exportFullBackup,
    importFullBackup,
    exportSeries,
    importSeries,
    exportProject,
    backupToGoogleDrive,
    restoreFromGoogleDrive,
    listDriveBackups,
  };
}
