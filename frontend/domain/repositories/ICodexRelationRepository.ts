import type { CodexRelation } from '@/domain/entities/types';

/**
 * Repository interface for Codex Relations
 * Decouples business logic from Dexie implementation
 */
export interface ICodexRelationRepository {
    /**
     * Get all relations for a specific codex entry (as parent)
     */
    getByParent(seriesId: string, parentId: string): Promise<CodexRelation[]>;

    /**
     * Create a new codex relation
     */
    create(seriesId: string, relation: Partial<CodexRelation> & { parentId: string; childId: string }): Promise<CodexRelation>;

    /**
     * Delete a codex relation
     */
    delete(seriesId: string, id: string): Promise<void>;
}
