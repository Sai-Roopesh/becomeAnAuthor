/**
 * Tauri Codex Repository
 * Implements ICodexRepository using file system through Tauri commands
 */

import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { CodexEntry, CodexCategory } from '@/domain/entities/types';
import {
    listCodexEntries,
    saveCodexEntry,
    deleteCodexEntry
} from '@/lib/tauri';
import { getCurrentProjectPath } from './TauriNodeRepository';

/**
 * Tauri-based Codex Repository
 * Stores codex entries as JSON files in ~/BecomeAnAuthor/Projects/{project}/codex/{category}/
 */
export class TauriCodexRepository implements ICodexRepository {
    async get(id: string): Promise<CodexEntry | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        const entries = await this.getByProject('current');
        return entries.find(e => e.id === id);
    }

    async getByProject(projectId: string): Promise<CodexEntry[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await listCodexEntries(projectPath);
        } catch (error) {
            console.error('Failed to list codex entries:', error);
            return [];
        }
    }

    async getByCategory(projectId: string, category: CodexCategory): Promise<CodexEntry[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await listCodexEntries(projectPath, category);
        } catch (error) {
            console.error('Failed to list codex entries by category:', error);
            return [];
        }
    }

    async search(projectId: string, query: string): Promise<CodexEntry[]> {
        const allEntries = await this.getByProject(projectId);
        const queryLower = query.toLowerCase();

        return allEntries.filter(entry =>
            entry.name.toLowerCase().includes(queryLower) ||
            entry.aliases?.some(alias => alias.toLowerCase().includes(queryLower))
        );
    }

    async create(entry: Partial<CodexEntry> & { projectId: string; name: string; category: CodexCategory }): Promise<CodexEntry> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        const now = Date.now();
        const newEntry: CodexEntry = {
            ...entry,
            id: crypto.randomUUID(),
            aliases: entry.aliases ?? [],
            description: entry.description ?? '',
            attributes: entry.attributes ?? {},
            tags: entry.tags ?? [],
            references: entry.references ?? [],
            settings: entry.settings ?? { isGlobal: false, doNotTrack: false },
            createdAt: now,
            updatedAt: now,
        };

        try {
            await saveCodexEntry(projectPath, newEntry);
            // ✅ Invalidate cache to trigger UI refresh
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
            return newEntry;
        } catch (error) {
            console.error('Failed to save codex entry:', error);
            throw error;
        }
    }

    async update(id: string, data: Partial<CodexEntry>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated: CodexEntry = {
            ...existing,
            ...data,
            updatedAt: Date.now(),
        };

        try {
            await saveCodexEntry(projectPath, updated);
            // ✅ Invalidate cache to trigger UI refresh
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
        } catch (error) {
            console.error('Failed to update codex entry:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const entry = await this.get(id);
        if (entry) {
            try {
                await deleteCodexEntry(projectPath, entry.category, id);
                // ✅ Invalidate cache to trigger UI refresh
                const { invalidateQueries } = await import('@/hooks/use-live-query');
                invalidateQueries();
            } catch (error) {
                console.error('Failed to delete codex entry:', error);
                throw error;
            }
        }
    }

    async bulkDelete(ids: string[]): Promise<void> {
        for (const id of ids) {
            await this.delete(id);
        }
    }
}
