// Shared backup/portability contract types.
//
// These describe the `.baa` package payloads exchanged over Tauri IPC and are
// consumed by both the domain layer (`domain/entities/types.ts`) and the IPC
// boundary (`core/tauri/command-modules/types.ts`). They live in `shared/` so
// both layers can depend on a single source of truth without an upward import.

export interface TrashedProject {
  id: string;
  title: string;
  originalPath: string;
  trashPath: string;
  deletedAt: number;
}

export type BackupPackageKind =
  | "full_snapshot"
  | "series_package"
  | "novel_package";

export interface BackupCounts {
  series: number;
  projects: number;
  scenes: number;
  codexEntries: number;
  codexRelations: number;
  codexTags: number;
  codexEntryTags: number;
  codexTemplates: number;
  codexRelationTypes: number;
  sceneCodexLinks: number;
  snippets: number;
  sceneNotes: number;
  chatThreads: number;
  chatMessages: number;
  yjsSnapshots: number;
  yjsUpdateLog: number;
}

export interface BackupSourceHints {
  seriesId?: string;
  seriesTitle?: string;
  projectId?: string;
  projectTitle?: string;
}

export interface BackupPackageSummary {
  kind: BackupPackageKind;
  path: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  sha256: string;
}

export interface BackupPackageInfo {
  kind: BackupPackageKind;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  counts: BackupCounts;
  sourceHints: BackupSourceHints;
}

export interface BackupImportOptions {
  targetSeriesId?: string;
  createSeriesTitle?: string;
}

export interface BackupImportResult {
  kind: BackupPackageKind;
  importedSeriesId?: string | null;
  importedProjectIds: string[];
  replacedAppData: boolean;
  checkpointPath?: string | null;
  requiresRelaunch: boolean;
}
