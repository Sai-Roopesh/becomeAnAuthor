/**
 * Idea Repository Interface
 * 
 * Abstraction for project-wide idea persistence.
 */

import type { Idea } from '@/domain/entities/types';

export interface IIdeaRepository {
    /**
     * List all ideas for the current project
     */
    list(): Promise<Idea[]>;

    /**
     * Create a new idea
     */
    create(idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>): Promise<Idea>;

    /**
     * Update an existing idea
     */
    update(idea: Idea): Promise<Idea>;

    /**
     * Delete an idea
     */
    delete(ideaId: string): Promise<void>;
}
