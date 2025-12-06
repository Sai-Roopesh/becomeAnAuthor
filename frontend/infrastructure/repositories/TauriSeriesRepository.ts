import { invoke } from '@tauri-apps/api/core';
import type { ISeriesRepository } from '@/domain/repositories/ISeriesRepository';
import type { Series } from '@/domain/entities/types';

/**
 * Tauri filesystem-based implementation of Series Repository
 * Stores series data in ~/.BecomeAnAuthor/.meta/series.json
 */
export class TauriSeriesRepository implements ISeriesRepository {

    async list(): Promise<Series[]> {
        try {
            return await invoke<Series[]>('list_series');
        } catch (error) {
            console.error('Failed to list series:', error);
            return [];
        }
    }

    async get(id: string): Promise<Series | undefined> {
        try {
            const all = await this.list();
            return all.find(s => s.id === id);
        } catch {
            return undefined;
        }
    }

    async getByName(name: string): Promise<Series | undefined> {
        const all = await this.list();
        return all.find(s => s.title.toLowerCase() === name.toLowerCase());
    }

    async create(series: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const result = await invoke<{ id: string }>('create_series', {
            title: series.title
        });
        return result.id;
    }

    async update(id: string, updates: Partial<Series>): Promise<void> {
        await invoke('update_series', {
            seriesId: id,
            updates
        });
    }

    async delete(id: string): Promise<void> {
        await invoke('delete_series', { seriesId: id });
    }
}
