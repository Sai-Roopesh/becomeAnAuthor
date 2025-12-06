/**
 * Tauri Snippet Repository
 * Implements ISnippetRepository using file system through Tauri commands
 */

import type { ISnippetRepository } from '@/domain/repositories/ISnippetRepository';
import type { Snippet } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from './TauriNodeRepository';

/**
 * Tauri-based Snippet Repository
 * Stores snippets as JSON files in ~/BecomeAnAuthor/Projects/{project}/snippets/
 */
export class TauriSnippetRepository implements ISnippetRepository {
    async get(id: string): Promise<Snippet | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        const snippets = await this.getByProject('current');
        return snippets.find(s => s.id === id);
    }

    async getByProject(projectId: string): Promise<Snippet[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await invoke<Snippet[]>('list_snippets', { projectPath });
        } catch (error) {
            console.error('Failed to list snippets:', error);
            return [];
        }
    }

    async getPinned(projectId: string): Promise<Snippet[]> {
        const snippets = await this.getByProject(projectId);
        return snippets.filter(s => s.pinned);
    }

    async create(snippet: Partial<Snippet> & { projectId: string; title: string }): Promise<Snippet> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        const now = Date.now();
        const newSnippet: Snippet = {
            id: crypto.randomUUID(),
            projectId: snippet.projectId,
            title: snippet.title,
            content: snippet.content ?? { type: 'doc', content: [] },
            pinned: snippet.pinned ?? false,
            createdAt: now,
            updatedAt: now,
        };

        await invoke('save_snippet', { projectPath, snippet: newSnippet });
        return newSnippet;
    }

    async update(id: string, data: Partial<Snippet>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated: Snippet = {
            ...existing,
            ...data,
            updatedAt: Date.now(),
        };

        await invoke('save_snippet', { projectPath, snippet: updated });
    }

    async togglePin(id: string): Promise<void> {
        const snippet = await this.get(id);
        if (snippet) {
            await this.update(id, { pinned: !snippet.pinned });
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_snippet', { projectPath, snippetId: id });
    }
}
