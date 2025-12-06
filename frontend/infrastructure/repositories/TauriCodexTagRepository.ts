/**
 * Tauri Codex Tag Repository
 * Implements ICodexTagRepository using file system through Tauri commands
 */

import type { ICodexTagRepository } from '@/domain/repositories/ICodexTagRepository';
import type { CodexTag } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexTagRepository implements ICodexTagRepository {
    async get(id: string): Promise<CodexTag | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        try {
            const tags = await invoke<CodexTag[]>('list_codex_tags', { projectPath });
            return tags.find(t => t.id === id);
        } catch {
            return undefined;
        }
    }

    async getByProject(projectId: string): Promise<CodexTag[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await invoke<CodexTag[]>('list_codex_tags', { projectPath });
        } catch {
            return [];
        }
    }

    async getByCategory(projectId: string, category: string): Promise<CodexTag[]> {
        const tags = await this.getByProject(projectId);
        return tags.filter(t => t.category === category);
    }

    async create(tag: Omit<CodexTag, 'id' | 'createdAt'>): Promise<CodexTag> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const newTag: CodexTag = {
            ...tag,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };

        await invoke('save_codex_tag', { projectPath, tag: newTag });
        return newTag;
    }

    async update(id: string, data: Partial<CodexTag>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated = { ...existing, ...data };
        await invoke('save_codex_tag', { projectPath, tag: updated });
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_codex_tag', { projectPath, tagId: id });
    }

    // Entry-Tag associations using codex_entry_tags.json
    async addTagToEntry(entryId: string, tagId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const entryTag = {
            id: crypto.randomUUID(),
            entryId,
            tagId,
        };
        await invoke('save_codex_entry_tag', { projectPath, entryTag });
    }

    async removeTagFromEntry(entryId: string, tagId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const entryTags = await invoke<{ id: string; entryId: string; tagId: string }[]>('list_codex_entry_tags', { projectPath });
        const toDelete = entryTags.find(et => et.entryId === entryId && et.tagId === tagId);
        if (toDelete) {
            await invoke('delete_codex_entry_tag', { projectPath, entryTagId: toDelete.id });
        }
    }

    async getEntriesByTag(tagId: string): Promise<string[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        const entryTags = await invoke<{ id: string; entryId: string; tagId: string }[]>('list_codex_entry_tags', { projectPath });
        return entryTags.filter(et => et.tagId === tagId).map(et => et.entryId);
    }

    async getTagsByEntry(entryId: string): Promise<CodexTag[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        const allTags = await this.getByProject('current');
        const entryTags = await invoke<{ id: string; entryId: string; tagId: string }[]>('list_codex_entry_tags', { projectPath });
        const tagIds = entryTags.filter(et => et.entryId === entryId).map(et => et.tagId);
        return allTags.filter(t => tagIds.includes(t.id));
    }
}
