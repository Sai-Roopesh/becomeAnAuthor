import { db } from '@/lib/core/database';
import type { Snippet } from '@/lib/config/types';
import type { ISnippetRepository } from '@/domain/repositories/ISnippetRepository';

/**
 * Dexie implementation of ISnippetRepository
 */
export class DexieSnippetRepository implements ISnippetRepository {
    async get(id: string): Promise<Snippet | undefined> {
        return await db.snippets.get(id);
    }

    async getByProject(projectId: string): Promise<Snippet[]> {
        return await db.snippets.where('projectId').equals(projectId).toArray();
    }

    async getPinned(projectId: string): Promise<Snippet[]> {
        return await db.snippets
            .where('projectId')
            .equals(projectId)
            .filter(s => s.pinned)
            .toArray();
    }

    async create(snippet: Partial<Snippet> & { projectId: string; title: string }): Promise<Snippet> {
        const newSnippet: Snippet = {
            id: crypto.randomUUID(),
            content: { type: 'doc', content: [] },
            pinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...snippet,
        };

        await db.snippets.add(newSnippet);
        return newSnippet;
    }

    async update(id: string, data: Partial<Snippet>): Promise<void> {
        await db.snippets.update(id, {
            ...data,
            updatedAt: Date.now(),
        });
    }

    async delete(id: string): Promise<void> {
        await db.snippets.delete(id);
    }
}
