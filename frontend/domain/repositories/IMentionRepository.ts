import type { Mention } from '@/domain/entities/types';

/**
 * Mention Repository Interface
 * Provides access to mention tracking data
 * 
 * Following Clean Architecture - this is the domain interface
 * Implementation is in infrastructure/repositories/TauriMentionRepository.ts
 */
export interface IMentionRepository {
    /**
     * Get all mentions of a codex entry
     */
    getByCodexEntry(projectId: string, codexEntryId: string): Promise<Mention[]>;

    /**
     * Get count of mentions for a codex entry
     */
    countByCodexEntry(projectId: string, codexEntryId: string): Promise<number>;

    /**
     * Rebuild the mention index for a project
     * Scans all scenes, codex entries, snippets, and chat messages
     */
    rebuildIndex(projectId: string): Promise<void>;

    /**
     * Get all mentions in a project grouped by codex entry
     */
    getAllByProject(projectId: string): Promise<Record<string, Mention[]>>;
}
