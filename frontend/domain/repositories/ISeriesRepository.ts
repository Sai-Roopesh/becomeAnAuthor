import type { Series } from '@/domain/entities/types';

/**
 * Repository interface for Series (book series grouping)
 */
export interface ISeriesRepository {
    /**
     * Get all series
     */
    list(): Promise<Series[]>;

    /**
     * Get a series by ID
     */
    get(id: string): Promise<Series | undefined>;

    /**
     * Find a series by its title (case-insensitive)
     */
    getByName(name: string): Promise<Series | undefined>;

    /**
     * Create a new series
     */
    create(series: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

    /**
     * Update an existing series
     */
    update(id: string, updates: Partial<Series>): Promise<void>;

    /**
     * Delete a series
     */
    delete(id: string): Promise<void>;

    /**
     * Delete a series and cascade delete all books belonging to it.
     * All books are moved to Trash before the series is deleted.
     * @returns number of books deleted
     */
    deleteCascade(id: string): Promise<number>;
}
