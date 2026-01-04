/**
 * Idea Repository Interface
 * 
 * Abstraction for project-wide idea persistence.
 */

import type { Idea } from '@/domain/entities/types';

export interface IIdeaRepository {
    /**
     * List all ideas for a project
     * @param projectId - Project ID to filter by
     * @returns All ideas in the project, sorted by createdAt
     */
    list(projectId: string): Promise<Idea[]>;

    /**
     * Create a new idea
     * @param idea - Idea data (without id, createdAt, updatedAt)
     * @returns The created idea with generated ID and timestamps
     */
    create(idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>): Promise<Idea>;

    /**
     * Update an existing idea
     * @param idea - Complete idea object with updated data
     * @returns The updated idea
     */
    update(idea: Idea): Promise<Idea>;

    /**
     * Delete an idea
     * @param ideaId - Idea ID to delete
     */
    delete(ideaId: string): Promise<void>;
}
