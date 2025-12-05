import { db } from '@/lib/core/database';
import type { CodexRelationType } from '@/lib/config/types';
import type { ICodexRelationTypeRepository } from '@/domain/repositories/ICodexRelationTypeRepository';
import { serializeForStorage } from './repository-helpers';

/**
 * Dexie implementation of ICodexRelationTypeRepository
 * 
 * ✅ ARCHITECTURE COMPLIANCE:
 * - Implements domain interface
 * - Serializes data before storage
 * - Located in infrastructure layer
 */
export class DexieCodexRelationTypeRepository implements ICodexRelationTypeRepository {
    async get(id: string): Promise<CodexRelationType | undefined> {
        return await db.codexRelationTypes.get(id);
    }

    async getAll(): Promise<CodexRelationType[]> {
        return await db.codexRelationTypes.toArray();
    }

    async getByCategory(category: string): Promise<CodexRelationType[]> {
        return await db.codexRelationTypes
            .where('category')
            .equals(category)
            .toArray();
    }

    async getBuiltIn(): Promise<CodexRelationType[]> {
        return await db.codexRelationTypes
            .where('isBuiltIn')
            .equals(1)  // ✅ Dexie uses 1 for true in boolean indexes
            .toArray();
    }

    async findDuplicates(): Promise<Array<{ name: string; category: string; count: number }>> {
        const all = await db.codexRelationTypes.toArray();
        const groups = new Map<string, number>();

        for (const type of all) {
            const key = `${type.name}|${type.category}`;
            groups.set(key, (groups.get(key) || 0) + 1);
        }

        return Array.from(groups.entries())
            .filter(([_, count]) => count > 1)
            .map(([key, count]) => {
                const [name, category] = key.split('|');
                return { name, category: category as any, count };
            });
    }

    async create(type: Omit<CodexRelationType, 'id'>): Promise<CodexRelationType> {
        const newType: CodexRelationType = {
            id: crypto.randomUUID(),
            ...type,
        };

        // ✅ CRITICAL: Serialize before storage
        const cleanType = serializeForStorage(newType);
        await db.codexRelationTypes.add(cleanType);

        return newType;
    }

    async update(id: string, data: Partial<CodexRelationType>): Promise<void> {
        const cleanData = serializeForStorage(data);
        await db.codexRelationTypes.update(id, cleanData);
    }

    async delete(id: string): Promise<void> {
        await db.codexRelationTypes.delete(id);
    }
}
