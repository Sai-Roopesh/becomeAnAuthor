import type { Project, TrashedProject } from "@/domain/entities/types";

/**
 * Project Repository Interface
 * Defines contract for project data operations
 */
export interface IProjectRepository {
  /**
   * Get project by ID
   */
  get(id: string): Promise<Project | undefined>;

  /**
   * Get all projects
   */
  getAll(): Promise<Project[]>;

  /**
   * Create a new project
   */
  create(
    project: Omit<Project, "id" | "createdAt" | "updatedAt"> & {
      customPath?: string;
    },
  ): Promise<string>;

  /**
   * Update project
   */
  update(id: string, updates: Partial<Project>): Promise<void>;

  /**
   * Archive a project (soft delete)
   */
  archive(id: string): Promise<void>;

  /**
   * Delete project and all associated data
   */
  delete(id: string): Promise<void>;

  /**
   * List projects currently in trash
   */
  listTrash(): Promise<TrashedProject[]>;

  /**
   * Restore a project from trash and return restored project ID
   */
  restoreFromTrash(trashPath: string): Promise<string>;

  /**
   * Permanently delete a trashed project
   */
  permanentlyDeleteFromTrash(trashPath: string): Promise<void>;

  /**
   * Get all projects in a series
   */
  getBySeries(seriesId: string): Promise<Project[]>;
}
