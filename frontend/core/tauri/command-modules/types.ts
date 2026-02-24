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

export interface TrashedProject {
  id: string;
  title: string;
  originalPath: string;
  trashPath: string;
  deletedAt: number;
}

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

export interface Scene {
  meta: SceneMeta;
  content: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: "scene" | "codex";
  contentType?: "scene" | "codex";
  snippet?: string;
  score?: number;
  category?: string;
  path: string;
}

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

export interface ImportSeriesResult {
  seriesId: string;
  seriesTitle: string;
  projectIds: string[];
  importedProjectCount: number;
}

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
