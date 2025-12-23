import type { CodexEntry, CodexCategory } from '@/domain/entities/types';

/**
 * Repository interface for Codex entries (worldbuilding)
 * Series-first architecture: all codex operations require seriesId
 * Codex is stored at series level, shared across all projects in a series
 */
export interface ICodexRepository {
    /**
     * Get a single codex entry by ID
     */
    get(seriesId: string, id: string): Promise<CodexEntry | undefined>;

    /**
     * Get all codex entries for a series
     */
    getBySeries(seriesId: string): Promise<CodexEntry[]>;

    /**
     * Get codex entries filtered by category
     */
    getByCategory(seriesId: string, category: CodexCategory): Promise<CodexEntry[]>;

    /**
     * Search codex entries by name or alias
     */
    search(seriesId: string, query: string): Promise<CodexEntry[]>;

    /**
     * Create a new codex entry
     */
    create(seriesId: string, entry: Partial<CodexEntry> & { name: string; category: CodexCategory }): Promise<CodexEntry>;

    /**
     * Update an existing codex entry
     */
    update(seriesId: string, id: string, data: Partial<CodexEntry>): Promise<void>;

    /**
     * Delete a codex entry
     */
    delete(seriesId: string, id: string, category: string): Promise<void>;

    /**
     * Bulk delete multiple entries
     */
    bulkDelete(seriesId: string, ids: string[], category: string): Promise<void>;
}
