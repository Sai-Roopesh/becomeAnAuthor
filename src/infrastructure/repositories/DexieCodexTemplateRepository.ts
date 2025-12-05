import { db } from '@/lib/core/database';
import type { CodexTemplate, CodexCategory } from '@/lib/config/types';
import type { ICodexTemplateRepository } from '@/domain/repositories/ICodexTemplateRepository';
import { serializeForStorage } from './repository-helpers';

/**
 * Dexie implementation of ICodexTemplateRepository
 * 
 * ✅ ARCHITECTURE COMPLIANCE:
 * - Implements domain interface
 * - Serializes data before storage
 * - Located in infrastructure layer
 */
export class DexieCodexTemplateRepository implements ICodexTemplateRepository {
    async get(id: string): Promise<CodexTemplate | undefined> {
        return await db.codexTemplates.get(id);
    }

    async getByCategory(category: CodexCategory): Promise<CodexTemplate[]> {
        return await db.codexTemplates
            .where('category')
            .equals(category)
            .toArray();
    }

    async getBuiltInTemplates(): Promise<CodexTemplate[]> {
        return await db.codexTemplates
            .where('isBuiltIn')
            .equals(1)  // ✅ Dexie uses 1 for true in boolean indexes
            .toArray();
    }

    async getUnique(): Promise<CodexTemplate[]> {
        const all = await db.codexTemplates.toArray();
        const seen = new Map<string, CodexTemplate>();

        for (const template of all) {
            const key = `${template.name}|${template.category}`;
            const existing = seen.get(key);

            if (!existing || template.createdAt < existing.createdAt) {
                seen.set(key, template);
            }
        }

        return Array.from(seen.values());
    }

    async findDuplicates(): Promise<Array<{ name: string; category: string; count: number }>> {
        const all = await db.codexTemplates.toArray();
        const groups = new Map<string, number>();

        for (const template of all) {
            const key = `${template.name}|${template.category}`;
            groups.set(key, (groups.get(key) || 0) + 1);
        }

        return Array.from(groups.entries())
            .filter(([_, count]) => count > 1)
            .map(([key, count]) => {
                const [name, category] = key.split('|');
                return { name, category: category as any, count };
            });
    }

    async getCustomTemplates(projectId: string): Promise<CodexTemplate[]> {
        return await db.codexTemplates
            .where('projectId')
            .equals(projectId)
            .toArray();
    }

    async create(template: Omit<CodexTemplate, 'id' | 'createdAt'>): Promise<CodexTemplate> {
        const newTemplate: CodexTemplate = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            ...template,
        };

        // ✅ CRITICAL: Serialize before storage
        const cleanTemplate = serializeForStorage(newTemplate);
        await db.codexTemplates.add(cleanTemplate);

        return newTemplate;
    }

    async update(id: string, data: Partial<CodexTemplate>): Promise<void> {
        // ✅ Serialize partial data as well
        const cleanData = serializeForStorage(data);
        await db.codexTemplates.update(id, cleanData);
    }

    async delete(id: string): Promise<void> {
        await db.codexTemplates.delete(id);
    }
}
