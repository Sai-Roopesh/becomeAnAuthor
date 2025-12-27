import type { Project } from '@/domain/entities/types';

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

    /**
     * Get all projects in a series
     */
    getBySeries(seriesId: string): Promise<Project[]>;
}
