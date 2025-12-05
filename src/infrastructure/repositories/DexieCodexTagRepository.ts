import { db } from '@/lib/core/database';
import type { CodexTag, CodexEntryTag } from '@/lib/config/types';
import type { ICodexTagRepository } from '@/domain/repositories/ICodexTagRepository';
import { serializeForStorage } from './repository-helpers';

/**
 * Dexie implementation of ICodexTagRepository
 * 
 * ✅ ARCHITECTURE COMPLIANCE:
 * - Implements domain interface
 * - Serializes data before storage
 * - Located in infrastructure layer
 */
export class DexieCodexTagRepository implements ICodexTagRepository {
    async get(id: string): Promise<CodexTag | undefined> {
        return await db.codexTags.get(id);
    }

    async getByProject(projectId: string): Promise<CodexTag[]> {
        return await db.codexTags
            .where('projectId')
            .equals(projectId)
            .toArray();
    }

    async getByCategory(projectId: string, category: string): Promise<CodexTag[]> {
        return await db.codexTags
            .where('projectId')
            .equals(projectId)
            .filter(t => t.category === category)
            .toArray();
    }

    async create(tag: Omit<CodexTag, 'id' | 'createdAt'>): Promise<CodexTag> {
        const newTag: CodexTag = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            ...tag,
        };

        // ✅ CRITICAL: Serialize before storage (architectural rule)
        const cleanTag = serializeForStorage(newTag);
        await db.codexTags.add(cleanTag);

        return newTag;
    }

    async update(id: string, data: Partial<CodexTag>): Promise<void> {
        await db.codexTags.update(id, data);
    }

    async delete(id: string): Promise<void> {
        // Delete tag and all associations atomically
        await db.transaction('rw', [db.codexTags, db.codexEntryTags], async () => {
            await db.codexEntryTags.where('tagId').equals(id).delete();
            await db.codexTags.delete(id);
        });
    }

    async addTagToEntry(entryId: string, tagId: string): Promise<void> {
        const association: CodexEntryTag = {
            id: crypto.randomUUID(),
            entryId,
            tagId,
        };

        // ✅ Serialize before storage
        const cleanAssociation = serializeForStorage(association);
        await db.codexEntryTags.add(cleanAssociation);
    }

    async removeTagFromEntry(entryId: string, tagId: string): Promise<void> {
        await db.codexEntryTags
            .where('[entryId+tagId]')
            .equals([entryId, tagId])
            .delete();
    }

    async getEntriesByTag(tagId: string): Promise<string[]> {
        const associations = await db.codexEntryTags
            .where('tagId')
            .equals(tagId)
            .toArray();
        return associations.map(a => a.entryId);
    }

    async getTagsByEntry(entryId: string): Promise<CodexTag[]> {
        const associations = await db.codexEntryTags
            .where('entryId')
            .equals(entryId)
            .toArray();

        const tagIds = associations.map(a => a.tagId);
        if (tagIds.length === 0) return [];

        return await db.codexTags.bulkGet(tagIds).then(tags =>
            tags.filter((t): t is CodexTag => t !== undefined)
        );
    }
}
