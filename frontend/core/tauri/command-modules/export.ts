import { invoke } from "@tauri-apps/api/core";
import type {
  AppInfo,
  BackupImportOptions,
  BackupImportResult,
  BackupPackageInfo,
  BackupPackageSummary,
} from "./types";

export async function exportFullSnapshot(
  outputPath?: string | null,
): Promise<BackupPackageSummary> {
  return invoke<BackupPackageSummary>("export_full_snapshot", {
    outputPath: outputPath ?? null,
  });
}

export async function exportSeriesPackage(
  seriesId: string,
  outputPath?: string | null,
): Promise<BackupPackageSummary> {
  return invoke<BackupPackageSummary>("export_series_package", {
    seriesId,
    outputPath: outputPath ?? null,
  });
}

export async function exportNovelPackage(
  projectId: string,
  outputPath?: string | null,
): Promise<BackupPackageSummary> {
  return invoke<BackupPackageSummary>("export_novel_package", {
    projectId,
    outputPath: outputPath ?? null,
  });
}

export async function inspectBackupPackage(
  packagePath: string,
): Promise<BackupPackageInfo> {
  return invoke<BackupPackageInfo>("inspect_backup_package", { packagePath });
}

export async function importBackupPackage(
  packagePath: string,
  options?: BackupImportOptions,
): Promise<BackupImportResult> {
  return invoke<BackupImportResult>("import_backup_package", {
    packagePath,
    options: options ?? null,
  });
}

export async function readFileBytes(filePath: string): Promise<number[]> {
  return invoke<number[]>("read_file_bytes", { filePath });
}

export async function writeTempBackupFile(
  fileName: string,
  data: number[],
): Promise<string> {
  return invoke<string>("write_temp_backup_file", { fileName, data });
}

export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("get_app_info");
}
