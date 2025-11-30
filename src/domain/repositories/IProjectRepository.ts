import type { Project } from '@/lib/types';

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
    create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

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
}
