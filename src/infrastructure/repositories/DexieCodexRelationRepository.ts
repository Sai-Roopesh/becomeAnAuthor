import { db } from '@/lib/core/database';
import type { CodexRelation } from '@/lib/config/types';
import type { ICodexRelationRepository } from '@/domain/repositories/ICodexRelationRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * Dexie implementation of ICodexRelationRepository
 * Wraps all Dexie database calls for codex relations
 */
export class DexieCodexRelationRepository implements ICodexRelationRepository {
    async getByParent(parentId: string): Promise<CodexRelation[]> {
        return await db.codexRelations.where('parentId').equals(parentId).toArray();
    }

    async create(relation: Partial<CodexRelation> & { parentId: string; childId: string }): Promise<CodexRelation> {
        const newRelation: CodexRelation = {
            id: uuidv4(),
            parentId: relation.parentId,
            childId: relation.childId,
            type: relation.type || 'related',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await db.codexRelations.add(newRelation);
        return newRelation;
    }

    async delete(id: string): Promise<void> {
        await db.codexRelations.delete(id);
    }
}
