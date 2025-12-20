/**
 * Tauri Codex Tag Repository
 * Implements ICodexTagRepository using file system through Tauri commands
 */

import type { ICodexTagRepository } from '@/domain/repositories/ICodexTagRepository';
import type { CodexTag } from '@/domain/entities/types';
import {
    listCodexTags,
    saveCodexTag,
    deleteCodexTag,
    listCodexEntryTags,
    saveCodexEntryTag,
    deleteCodexEntryTag
} from '@/core/tauri';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexTagRepository implements ICodexTagRepository {
    async get(id: string): Promise<CodexTag | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        try {
            const tags = await listCodexTags(projectPath) as unknown as CodexTag[];
            return tags.find(t => t.id === id);
        } catch (error) {
            console.error('Failed to get codex tag:', error);
            return undefined;
        }
    }

    async getByProject(projectId: string): Promise<CodexTag[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await listCodexTags(projectPath) as unknown as CodexTag[];
        } catch (error) {
            console.error('Failed to list codex tags:', error);
            return [];
        }
    }

    async getByCategory(projectId: string, category: string): Promise<CodexTag[]> {
        const tags = await this.getByProject(projectId);
        return tags.filter(t => (t as any).category === category);
    }

    async create(tag: Omit<CodexTag, 'id' | 'createdAt' | 'updatedAt'>): Promise<CodexTag> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const now = Date.now();
        const newTag: CodexTag = {
            ...tag,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        } as CodexTag;

        try {
            await saveCodexTag(projectPath, newTag as any);
            return newTag;
        } catch (error) {
            console.error('Failed to create codex tag:', error);
            throw error;
        }
    }

    async update(id: string, data: Partial<CodexTag>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated = { ...existing, ...data };
        try {
            await saveCodexTag(projectPath, updated as any);
        } catch (error) {
            console.error('Failed to update codex tag:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            await deleteCodexTag(projectPath, id);
        } catch (error) {
            console.error('Failed to delete codex tag:', error);
            throw error;
        }
    }

    // Entry-Tag associations using codex_entry_tags.json
    async addTagToEntry(entryId: string, tagId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const entryTag = {
            id: crypto.randomUUID(),
            entryId: entryId,
            tagId: tagId,
        };

        try {
            await saveCodexEntryTag(projectPath, entryTag);
        } catch (error) {
            console.error('Failed to add tag to entry:', error);
            throw error;
        }
    }

    async removeTagFromEntry(entryId: string, tagId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            const entryTags = await listCodexEntryTags(projectPath);
            const toDelete = entryTags.find(et => et.entryId === entryId && et.tagId === tagId);
            if (toDelete) {
                await deleteCodexEntryTag(projectPath, toDelete.id);
            }
        } catch (error) {
            console.error('Failed to remove tag from entry:', error);
            throw error;
        }
    }

    async getEntriesByTag(tagId: string): Promise<string[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const entryTags = await listCodexEntryTags(projectPath);
            return entryTags.filter(et => et.tagId === tagId).map(et => et.entryId);
        } catch (error) {
            console.error('Failed to get entries by tag:', error);
            return [];
        }
    }

    async getTagsByEntry(entryId: string): Promise<CodexTag[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const allTags = await this.getByProject('current');
            const entryTags = await listCodexEntryTags(projectPath);
            const tagIds = entryTags.filter(et => et.entryId === entryId).map(et => et.tagId);
            return allTags.filter(t => tagIds.includes(t.id));
        } catch (error) {
            console.error('Failed to get tags by entry:', error);
            return [];
        }
    }

}
