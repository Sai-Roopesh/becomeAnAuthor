import { db } from '@/lib/core/database';
import type { CodexRelation } from '@/lib/config/types';
import type { ICodexRelationRepository } from '@/domain/repositories/ICodexRelationRepository';
import { v4 as uuidv4 } from 'uuid';
import { serializeForStorage } from './repository-helpers';

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
            createdAt: Date.now(),
        };

        // ✅ Serialize before storing
        const cleanRelation = serializeForStorage(newRelation);
        await db.codexRelations.add(cleanRelation);

        return newRelation;
    }

    async delete(id: string): Promise<void> {
        await db.codexRelations.delete(id);
    }
}
