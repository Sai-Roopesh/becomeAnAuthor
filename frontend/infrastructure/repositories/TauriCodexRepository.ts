/**
 * Tauri Codex Repository
 * Series-first architecture: all codex operations use seriesId
 * Codex is stored at series level: ~/BecomeAnAuthor/series/{seriesId}/codex/
 */

import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { CodexEntry, CodexCategory } from '@/domain/entities/types';
import {
    listSeriesCodexEntries,
    getSeriesCodexEntry,
    saveSeriesCodexEntry,
    deleteSeriesCodexEntry
} from '@/core/tauri';

/**
 * Tauri-based Codex Repository
 * Stores codex entries as JSON files in ~/BecomeAnAuthor/series/{seriesId}/codex/{category}/
 */
export class TauriCodexRepository implements ICodexRepository {
    async get(seriesId: string, id: string): Promise<CodexEntry | undefined> {
        if (!seriesId) return undefined;

        try {
            const entry = await getSeriesCodexEntry(seriesId, id);
            return entry ?? undefined;
        } catch (error) {
            console.error('Failed to get codex entry:', error);
            return undefined;
        }
    }

    async getBySeries(seriesId: string): Promise<CodexEntry[]> {
        if (!seriesId) return [];

        try {
            return await listSeriesCodexEntries(seriesId);
        } catch (error) {
            console.error('Failed to list codex entries:', error);
            return [];
        }
    }

    async getByCategory(seriesId: string, category: CodexCategory): Promise<CodexEntry[]> {
        if (!seriesId) return [];

        try {
            return await listSeriesCodexEntries(seriesId, category);
        } catch (error) {
            console.error('Failed to list codex entries by category:', error);
            return [];
        }
    }

    async search(seriesId: string, query: string): Promise<CodexEntry[]> {
        const allEntries = await this.getBySeries(seriesId);
        const queryLower = query.toLowerCase();

        return allEntries.filter(entry =>
            entry.name.toLowerCase().includes(queryLower) ||
            entry.aliases?.some(alias => alias.toLowerCase().includes(queryLower))
        );
    }

    async create(
        seriesId: string,
        entry: Partial<CodexEntry> & { name: string; category: CodexCategory }
    ): Promise<CodexEntry> {
        if (!seriesId) {
            throw new Error('Series ID is required');
        }

        const now = Date.now();
        const newEntry: CodexEntry = {
            ...entry,
            id: crypto.randomUUID(),
            projectId: '', // No longer used - kept for backwards compat
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
            await saveSeriesCodexEntry(seriesId, newEntry);
            // Invalidate cache to trigger UI refresh
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
            return newEntry;
        } catch (error) {
            console.error('Failed to save codex entry:', error);
            throw error;
        }
    }

    async update(seriesId: string, id: string, data: Partial<CodexEntry>): Promise<void> {
        if (!seriesId) return;

        const existing = await this.get(seriesId, id);
        if (!existing) return;

        const updated: CodexEntry = {
            ...existing,
            ...data,
            updatedAt: Date.now(),
        };

        try {
            await saveSeriesCodexEntry(seriesId, updated);
            // Invalidate cache to trigger UI refresh
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
        } catch (error) {
            console.error('Failed to update codex entry:', error);
            throw error;
        }
    }

    async delete(seriesId: string, id: string, category: string): Promise<void> {
        if (!seriesId) return;

        try {
            await deleteSeriesCodexEntry(seriesId, id, category);
            // Invalidate cache to trigger UI refresh
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
        } catch (error) {
            console.error('Failed to delete codex entry:', error);
            throw error;
        }
    }

    async bulkDelete(seriesId: string, ids: string[], category: string): Promise<void> {
        for (const id of ids) {
            await this.delete(seriesId, id, category);
        }
    }
}

