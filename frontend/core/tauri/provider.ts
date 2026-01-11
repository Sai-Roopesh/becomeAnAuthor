/**
 * Tauri Data Provider
 *
 * This provider acts as a bridge between the existing repository pattern
 * and the Tauri file system backend. It allows the app to work in both
 * browser (IndexedDB) and desktop (Tauri) modes.
 *
 * Series-first architecture: all projects must belong to a series.
 */

import {
  isTauri,
  listProjects,
  createProject,
  deleteProject as deleteProjectTauri,
} from "./commands";
import type { ProjectMeta } from "./commands";

// Re-export isTauri for use in components
export { isTauri };

/**
 * Get the storage mode - either 'tauri' or 'indexeddb'
 */
export function getStorageMode(): "tauri" | "indexeddb" {
  return isTauri() ? "tauri" : "indexeddb";
}

/**
 * Convert Tauri ProjectMeta to app's Project type
 */
export function projectMetaToProject(meta: ProjectMeta): {
  id: string;
  title: string;
  author: string;
  description: string;
  seriesId: string;
  seriesIndex: string;
  archived: boolean;
  language: string | undefined;
  coverImage: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  path: string | undefined;
} {
  return {
    id: meta.id,
    title: meta.title,
    author: meta.author,
    description: meta.description,
    seriesId: meta.series_id,
    seriesIndex: meta.series_index,
    archived: meta.archived,
    language: meta.language,
    coverImage: meta.cover_image,
    createdAt: new Date(meta.created_at),
    updatedAt: new Date(meta.updated_at),
    path: meta.path,
  };
}

/**
 * Project operations for Tauri mode
 * Series-first: create requires seriesId and seriesIndex
 */
export const tauriProjectOps = {
  async getAll() {
    const projects = await listProjects();
    return projects.map(projectMetaToProject);
  },

  async create(
    title: string,
    author: string,
    customPath: string,
    seriesId: string,
    seriesIndex: string,
  ) {
    if (!seriesId) {
      throw new Error(
        "Series ID is required. All projects must belong to a series.",
      );
    }
    const project = await createProject(
      title,
      author,
      customPath,
      seriesId,
      seriesIndex,
    );
    return projectMetaToProject(project);
  },

  async delete(projectPath: string) {
    await deleteProjectTauri(projectPath);
  },
};
