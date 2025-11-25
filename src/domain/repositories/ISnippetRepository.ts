import type { Snippet } from '@/lib/config/types';

/**
 * Repository interface for Snippets
 * Decouples business logic from Dexie implementation
 */
export interface ISnippetRepository {
    /**
     * Get a single snippet by ID
     */
    get(id: string): Promise<Snippet | undefined>;

    /**
     * Get all snippets for a project
     */
    getByProject(projectId: string): Promise<Snippet[]>;

    /**
     * Get pinned snippets for a project
     */
    getPinned(projectId: string): Promise<Snippet[]>;

    /**
     * Create a new snippet
     */
    create(snippet: Partial<Snippet> & { projectId: string; title: string }): Promise<Snippet>;

    /**
     * Update a snippet
     */
    update(id: string, data: Partial<Snippet>): Promise<void>;

    /**
     * Delete a snippet
     */
    delete(id: string): Promise<void>;
}
