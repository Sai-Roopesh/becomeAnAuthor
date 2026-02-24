import { invoke } from "@tauri-apps/api/core";
import type { AppInfo, ImportSeriesResult } from "./types";

export async function exportManuscriptText(
  projectPath: string,
): Promise<string> {
  return invoke<string>("export_manuscript_text", { projectPath });
}

export async function exportSeriesBackup(
  seriesId: string,
  outputPath?: string | null,
): Promise<string> {
  return invoke<string>("export_series_backup", { seriesId, outputPath });
}

export async function exportSeriesAsJson(seriesId: string): Promise<string> {
  return invoke<string>("export_series_as_json", { seriesId });
}

export async function importSeriesBackup(
  backupJson: string,
): Promise<ImportSeriesResult> {
  return invoke<ImportSeriesResult>("import_series_backup", { backupJson });
}

export async function exportManuscriptDocx(
  projectPath: string,
  outputPath: string,
): Promise<string> {
  return invoke<string>("export_manuscript_docx", { projectPath, outputPath });
}

export async function exportManuscriptEpub(
  projectPath: string,
  outputPath: string,
  title?: string,
  author?: string,
  language?: string,
): Promise<string> {
  return invoke<string>("export_manuscript_epub", {
    projectPath,
    outputPath,
    title,
    author,
    language,
  });
}

export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("get_app_info");
}
