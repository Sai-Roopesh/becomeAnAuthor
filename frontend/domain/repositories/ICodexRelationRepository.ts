import type { CodexRelation } from '@/lib/config/types';

/**
 * Repository interface for Codex Relations
 * Decouples business logic from Dexie implementation
 */
export interface ICodexRelationRepository {
    /**
     * Get all relations for a specific codex entry (as parent)
     */
    getByParent(parentId: string): Promise<CodexRelation[]>;

    /**
     * Create a new codex relation
     */
    create(relation: Partial<CodexRelation> & { parentId: string; childId: string }): Promise<CodexRelation>;

    /**
     * Delete a codex relation
     */
    delete(id: string): Promise<void>;
}
