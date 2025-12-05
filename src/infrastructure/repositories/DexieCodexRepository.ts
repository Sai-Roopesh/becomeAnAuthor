import { db } from '@/lib/core/database';
import type { CodexEntry, CodexCategory } from '@/lib/config/types';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import { serializeForStorage } from './repository-helpers';

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

    async create(entry: Omit<CodexEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<CodexEntry> {
        // ✅ Validate template matches category (safety net)
        if (entry.templateId) {
            const template = await db.codexTemplates.get(entry.templateId);
            if (template && template.category !== entry.category) {
                throw new Error(
                    `Template category mismatch: template "${template.name}" is for "${template.category}" but entry category is "${entry.category}"`
                );
            }
        }

        const newEntry: CodexEntry = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // Spread entry first
            ...entry,
            // Then apply defaults only if not provided
            aliases: entry.aliases ?? [],
            description: entry.description ?? '',
            attributes: entry.attributes ?? {},
            tags: entry.tags ?? [],
            references: entry.references ?? [],
            settings: entry.settings ?? {
                isGlobal: false,
                doNotTrack: false,
            },
        };

        // ✅ Serialize before storing (attributes/references may be complex objects)
        const cleanEntry = serializeForStorage(newEntry);
        await db.codex.add(cleanEntry);

        return newEntry;
    }

    async update(id: string, data: Partial<CodexEntry>): Promise<void> {
        // ✅ Validate template-category match if either is being changed
        if (data.category || data.templateId !== undefined) {
            const existing = await this.get(id);
            if (!existing) throw new Error('Entry not found');

            const finalCategory = data.category || existing.category;
            const finalTemplateId = data.templateId !== undefined
                ? data.templateId
                : existing.templateId;

            if (finalTemplateId) {
                const template = await db.codexTemplates.get(finalTemplateId);
                if (template && template.category !== finalCategory) {
                    throw new Error(
                        `Template category mismatch: cannot use "${template.category}" template for "${finalCategory}" entry`
                    );
                }
            }
        }

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
