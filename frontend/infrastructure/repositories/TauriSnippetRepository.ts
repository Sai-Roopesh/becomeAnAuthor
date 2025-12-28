/**
 * Tauri Snippet Repository
 * Implements ISnippetRepository using file system through Tauri commands
 */

import type { ISnippetRepository } from '@/domain/repositories/ISnippetRepository';
import type { Snippet } from '@/domain/entities/types';
import {
    listSnippets,
    saveSnippet,
    deleteSnippet
} from '@/core/tauri';
import { TauriNodeRepository } from './TauriNodeRepository';

/**
 * Tauri-based Snippet Repository
 * Stores snippets as JSON files in ~/BecomeAnAuthor/Projects/{project}/snippets/
 */
export class TauriSnippetRepository implements ISnippetRepository {
    async get(id: string): Promise<Snippet | undefined> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return undefined;

        const snippets = await this.getByProject('current');
        return snippets.find(s => s.id === id);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getByProject(_projectId: string): Promise<Snippet[]> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return [];

        try {
            return await listSnippets(projectPath) as unknown as Snippet[];
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
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
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

        try {
            await saveSnippet(projectPath, newSnippet);
            return newSnippet;
        } catch (error) {
            console.error('Failed to create snippet:', error);
            throw error;
        }
    }

    async update(id: string, data: Partial<Snippet>): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated: Snippet = {
            ...existing,
            ...data,
            updatedAt: Date.now(),
        };

        try {
            await saveSnippet(projectPath, updated);
        } catch (error) {
            console.error('Failed to update snippet:', error);
            throw error;
        }
    }

    async togglePin(id: string): Promise<void> {
        const snippet = await this.get(id);
        if (snippet) {
            await this.update(id, { pinned: !snippet.pinned });
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            await deleteSnippet(projectPath, id);
        } catch (error) {
            console.error('Failed to delete snippet:', error);
            throw error;
        }
    }
}
