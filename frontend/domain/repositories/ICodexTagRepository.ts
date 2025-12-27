import type { CodexTag, CodexEntryTag } from '@/domain/entities/types';

/**
 * Repository interface for Codex Tag operations
 * 
 * ✅ ARCHITECTURE: Domain layer interface - implementation agnostic
 */
export interface ICodexTagRepository {
    // Tag CRUD
    get(id: string): Promise<CodexTag | undefined>;
    getByProject(projectId: string): Promise<CodexTag[]>;
    getByCategory(projectId: string, category: string): Promise<CodexTag[]>;
    create(tag: Omit<CodexTag, 'id' | 'createdAt' | 'updatedAt'>): Promise<CodexTag>;
    update(id: string, data: Partial<CodexTag>): Promise<void>;
    delete(id: string): Promise<void>;

    // Entry-Tag associations
    addTagToEntry(entryId: string, tagId: string): Promise<void>;
    removeTagFromEntry(entryId: string, tagId: string): Promise<void>;
    getEntriesByTag(tagId: string): Promise<string[]>;  // entry IDs
    getTagsByEntry(entryId: string): Promise<CodexTag[]>;
}
