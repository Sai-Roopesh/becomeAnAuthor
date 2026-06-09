export interface ProjectMeta {
  id: string;
  title: string;
  author: string;
  description: string;
  path: string;
  archived: boolean;
  language?: string;
  cover_image?: string;
  series_id: string;
  series_index: string;
  created_at: string;
  updated_at: string;
}

export interface RecentProject {
  path: string;
  title: string;
  lastOpened: number;
}

export type { TrashedProject } from "@/shared/types/backup";

export interface DeletedSeriesMeta {
  oldSeriesId: string;
  title: string;
  deletedAt: number;
}

export interface StructureNode {
  id: string;
  type: string;
  title: string;
  order: number;
  children: StructureNode[];
  file?: string;
}

export interface SceneMeta {
  id: string;
  title: string;
  order: number;
  status: string;
  word_count: number;
  pov_character?: string;
  subtitle?: string;
  labels?: string[];
  exclude_from_ai?: boolean;
  summary?: string;
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Raw payload returned by the `load_scene` Tauri command: scene metadata
 * (snake_case, RFC3339 string timestamps) plus the scene body as a JSON
 * string. This is the wire DTO — distinct from the camelCase domain `Scene`
 * entity in `@/domain/entities/types`. Map it to the domain entity in the
 * repository layer (see `TauriNodeRepository.extractSceneMetadata`).
 */
export interface LoadedSceneDto {
  id: string;
  title: string;
  order: number;
  status: string;
  word_count: number;
  pov_character?: string;
  subtitle?: string;
  labels?: string[];
  exclude_from_ai?: boolean;
  summary?: string;
  archived?: boolean;
  created_at: string;
  updated_at: string;
  content: string;
}

import type { SearchResult } from "@/domain/entities/types";
export type { SearchResult };

export interface ProjectUpdates {
  title?: string;
  author?: string;
  description?: string;
  archived?: boolean;
  language?: string;
  cover_image?: string;
  series_id?: string;
  series_index?: string;
}

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
}

export type {
  BackupPackageKind,
  BackupCounts,
  BackupSourceHints,
  BackupPackageSummary,
  BackupPackageInfo,
  BackupImportOptions,
  BackupImportResult,
} from "@/shared/types/backup";

export interface SaveDialogOptions {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  title?: string;
}

export interface OpenDialogOptions {
  defaultPath?: string;
  directory?: boolean;
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
  title?: string;
}
