import { db } from '@/lib/core/database';
import type { CodexEntry, CodexCategory } from '@/lib/config/types';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';

/**
 * Dexie implementation of ICodexRepository
 * Wraps all Dexie database calls for codex entries
 */
export class DexieCodexRepository implements ICodexRepository {
    async get(id: string): Promise<CodexEntry | undefined> {
        return await db.codex.get(id);
    }

    async getByProject(projectId: string): Promise<CodexEntry[]> {
        return await db.codex.where('projectId').equals(projectId).toArray();
    }

    async getByCategory(projectId: string, category: CodexCategory): Promise<CodexEntry[]> {
        return await db.codex
            .where('projectId')
            .equals(projectId)
            .filter(entry => entry.category === category)
            .toArray();
    }

    async search(projectId: string, query: string): Promise<CodexEntry[]> {
        const lowerQuery = query.toLowerCase();
        return await db.codex
            .where('projectId')
            .equals(projectId)
            .filter(entry =>
                entry.name.toLowerCase().includes(lowerQuery) ||
                entry.aliases?.some((alias: string) => alias.toLowerCase().includes(lowerQuery))
            )
            .toArray();
    }

    async create(entry: Partial<CodexEntry> & { projectId: string; name: string; category: CodexCategory }): Promise<CodexEntry> {
        const newEntry: CodexEntry = {
            id: crypto.randomUUID(),
            aliases: [],
            description: '',
            attributes: {},
            tags: [],
            references: [],
            settings: {
                isGlobal: false,
                doNotTrack: false,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...entry,
        };

        await db.codex.add(newEntry);
        return newEntry;
    }

    async update(id: string, data: Partial<CodexEntry>): Promise<void> {
        await db.codex.update(id, {
            ...data,
            updatedAt: Date.now(),
        });
    }

    async delete(id: string): Promise<void> {
        await db.codex.delete(id);
    }

    async bulkDelete(ids: string[]): Promise<void> {
        await db.codex.bulkDelete(ids);
    }
}
