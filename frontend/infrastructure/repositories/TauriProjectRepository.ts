/**
 * Tauri Project Repository
 * Series-first architecture: all projects must belong to a series
 */

import type { IProjectRepository } from "@/domain/repositories/IProjectRepository";
import type { Project, TrashedProject } from "@/domain/entities/types";
import {
  listProjects,
  createProject,
  getProjectsPath,
  deleteProject as deleteProjectCommand,
  listProjectTrash,
  restoreTrashedProject,
  permanentlyDeleteTrashedProject,
  updateProject as updateProjectCommand,
  archiveProject as archiveProjectCommand,
  type ProjectMeta,
} from "@/core/tauri";
import { TauriNodeRepository } from "./TauriNodeRepository";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriProjectRepository");

/**
 * Convert Tauri ProjectMeta to app's Project type
 */
function projectMetaToProject(
  meta: ProjectMeta,
): Project & { _tauriPath?: string } {
  return {
    id: meta.id,
    title: meta.title,
    author: meta.author || "",
    // Backend sends RFC3339 strings, convert to timestamps
    createdAt: new Date(meta.created_at).getTime(),
    updatedAt: new Date(meta.updated_at).getTime(),
    language: meta.language || "English (US)",
    coverImage: meta.cover_image || "",
    archived: meta.archived || false,
    seriesId: meta.series_id,
    seriesIndex: meta.series_index,
    // Store path for later use
    _tauriPath: meta.path,
  };
}

/**
 * Tauri-based Project Repository
 * Manages projects as folders in ~/BecomeAnAuthor/Projects/
 * All projects must belong to a series
 */
export class TauriProjectRepository implements IProjectRepository {
  async get(id: string): Promise<Project | undefined> {
    const projects = await this.getAll();
    const project = projects.find((p) => p.id === id);

    if (project) {
      // Set the current project path for other repos to use
      const tauriProject = project as Project & { _tauriPath?: string };
      if (tauriProject._tauriPath) {
        TauriNodeRepository.getInstance().setProjectPath(
          tauriProject._tauriPath,
        );
      }
    }

    return project;
  }

  async getAll(): Promise<Project[]> {
    try {
      const projects = await listProjects();
      return projects.map(projectMetaToProject);
    } catch (error) {
      log.error("Failed to list projects:", error);
      return [];
    }
  }

  async create(params: {
    title: string;
    author: string;
    language?: string;
    seriesId: string; // REQUIRED - all projects must belong to a series
    seriesIndex: string; // REQUIRED - e.g., "Book 1"
    customPath?: string;
  }): Promise<string> {
    if (!params.seriesId) {
      throw new Error(
        "Series ID is required. All projects must belong to a series.",
      );
    }
    if (!params.seriesIndex) {
      throw new Error('Series index is required (e.g., "Book 1").');
    }

    const basePath = params.customPath || (await getProjectsPath());

    const created = await createProject(
      params.title,
      params.author || "Unknown",
      basePath,
      params.seriesId,
      params.seriesIndex,
    );
    // Set the current project path so TauriNodeRepository can create nodes
    TauriNodeRepository.getInstance().setProjectPath(created.path);
    return created.id;
  }

  async update(id: string, updates: Partial<Project>): Promise<void> {
    const projects = await listProjects();
    const project = projects.find((p) => p.id === id);

    if (project) {
      await updateProjectCommand(project.path, {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.author !== undefined && { author: updates.author }),
        ...(updates.archived !== undefined && { archived: updates.archived }),
        ...(updates.language !== undefined && { language: updates.language }),
        ...(updates.coverImage !== undefined && {
          cover_image: updates.coverImage,
        }),
        ...(updates.seriesId !== undefined && { series_id: updates.seriesId }),
        ...(updates.seriesIndex !== undefined && {
          series_index: updates.seriesIndex,
        }),
      });

      // Invalidate cache so UI updates
      const { invalidateQueries } = await import("@/hooks/use-live-query");
      invalidateQueries();
    }
  }

  async archive(id: string): Promise<void> {
    const projects = await listProjects();
    const project = projects.find((p) => p.id === id);

    if (project) {
      await archiveProjectCommand(project.path);
    }
  }

  async delete(id: string): Promise<void> {
    // Find project path from ID
    const projects = await listProjects();
    const project = projects.find((p) => p.id === id);

    if (project) {
      // Delete via Tauri
      await deleteProjectCommand(project.path);

      // Invalidate cache so UI updates
      const { invalidateQueries } = await import("@/hooks/use-live-query");
      invalidateQueries();
    }
  }

  async listTrash(): Promise<TrashedProject[]> {
    try {
      return await listProjectTrash();
    } catch (error) {
      log.error("Failed to list trashed projects:", error);
      return [];
    }
  }

  async restoreFromTrash(trashPath: string): Promise<string> {
    const restored = await restoreTrashedProject(trashPath);
    const { invalidateQueries } = await import("@/hooks/use-live-query");
    invalidateQueries(["projects", "series"]);
    return restored.id;
  }

  async permanentlyDeleteFromTrash(trashPath: string): Promise<void> {
    await permanentlyDeleteTrashedProject(trashPath);
    const { invalidateQueries } = await import("@/hooks/use-live-query");
    invalidateQueries("projects");
  }

  async getBySeries(seriesId: string): Promise<Project[]> {
    // Get all projects and filter by seriesId
    const allProjects = await this.getAll();
    return allProjects.filter((project) => project.seriesId === seriesId);
  }
}
