import type { CodexEntry, CodexCategory } from '@/lib/config/types';

/**
 * Repository interface for Codex entries (worldbuilding)
 * Decouples business logic from Dexie implementation
 */
export interface ICodexRepository {
    /**
     * Get a single codex entry by ID
     */
    get(id: string): Promise<CodexEntry | undefined>;

    /**
     * Get all codex entries for a project
     */
    getByProject(projectId: string): Promise<CodexEntry[]>;

    /**
     * Get codex entries filtered by category
     */
    getByCategory(projectId: string, category: CodexCategory): Promise<CodexEntry[]>;

    /**
     * Search codex entries by name or alias
     */
    search(projectId: string, query: string): Promise<CodexEntry[]>;

    /**
     * Create a new codex entry
     */
    create(entry: Partial<CodexEntry> & { projectId: string; name: string; category: CodexCategory }): Promise<CodexEntry>;

    /**
     * Update an existing codex entry
     */
    update(id: string, data: Partial<CodexEntry>): Promise<void>;

    /**
     * Delete a codex entry
     */
    delete(id: string): Promise<void>;

    /**
     * Bulk delete multiple entries
     */
    bulkDelete(ids: string[]): Promise<void>;
}
