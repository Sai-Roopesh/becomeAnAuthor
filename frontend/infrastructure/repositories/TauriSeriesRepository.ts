import {
    listSeries,
    createSeries,
    updateSeries,
    deleteSeries,
    deleteSeriesCascade
} from '@/core/tauri';
import type { ISeriesRepository } from '@/domain/repositories/ISeriesRepository';
import type { Series } from '@/domain/entities/types';

/**
 * Tauri filesystem-based implementation of Series Repository
 * Stores series data in ~/.BecomeAnAuthor/.meta/series.json
 */
export class TauriSeriesRepository implements ISeriesRepository {

    async list(): Promise<Series[]> {
        try {
            return await listSeries() as unknown as Series[];
        } catch (error) {
            console.error('Failed to list series:', error);
            return [];
        }
    }

    async get(id: string): Promise<Series | undefined> {
        try {
            const all = await this.list();
            return all.find(s => s.id === id);
        } catch (error) {
            console.error('Failed to get series:', error);
            return undefined;
        }
    }

    async getByName(name: string): Promise<Series | undefined> {
        const all = await this.list();
        return all.find(s => s.title.toLowerCase() === name.toLowerCase());
    }

    async create(series: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const result = await createSeries({ title: series.title });
            return result.id;
        } catch (error) {
            console.error('Failed to create series:', error);
            throw error;
        }
    }

    async update(id: string, updates: Partial<Series>): Promise<void> {
        try {
            await updateSeries(id, updates as any);
        } catch (error) {
            console.error('Failed to update series:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await deleteSeries(id);
        } catch (error) {
            console.error('Failed to delete series:', error);
            throw error;
        }
    }

    async deleteCascade(id: string): Promise<number> {
        try {
            return await deleteSeriesCascade(id);
        } catch (error) {
            console.error('Failed to cascade delete series:', error);
            throw error;
        }
    }
}
