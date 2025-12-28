/**
 * TauriSeriesRepository Specification Tests
 * 
 * Tests define EXPECTED BEHAVIOR for series management:
 * - Cascade delete removes series + all books
 * - deleteCascade returns count of deleted books
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriSeriesRepository } from '../TauriSeriesRepository';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('@/core/tauri', () => ({
    listSeries: vi.fn(),
    createSeries: vi.fn(),
    updateSeries: vi.fn(),
    deleteSeries: vi.fn(),
    deleteSeriesCascade: vi.fn(),
}));

import * as tauriCommands from '@/core/tauri';

// ============================================
// Test Fixtures
// ============================================

const createMockSeries = (overrides: Partial<import('@/domain/entities/types').Series> = {}) => ({
    id: 'series-1',
    title: 'Fantasy Series',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
});

// ============================================
// Specification Tests
// ============================================

describe('TauriSeriesRepository Contract', () => {
    let repo: TauriSeriesRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new TauriSeriesRepository();
    });

    // ========================================
    // SPECIFICATION: Cascade Delete
    // ========================================

    describe('Cascade Delete - REQUIREMENT: Delete series + all books', () => {
        it('MUST return 0 when deleting empty series', async () => {
            // @ts-expect-error - Mock command will be implemented
            vi.mocked(tauriCommands.deleteSeriesCascade).mockResolvedValue(0);

            const count = await repo.deleteCascade('empty-series');

            expect(count).toBe(0);
        });

        it('MUST return count of deleted books when deleting series with books', async () => {
            // @ts-expect-error - Mock command will be implemented
            vi.mocked(tauriCommands.deleteSeriesCascade).mockResolvedValue(3);

            const count = await repo.deleteCascade('series-with-books');

            expect(count).toBe(3);
        });

        it('MUST throw error if cascade delete fails', async () => {
            // @ts-expect-error - Mock command will be implemented
            vi.mocked(tauriCommands.deleteSeriesCascade).mockRejectedValue(
                new Error('Series not found')
            );

            await expect(repo.deleteCascade('non-existent'))
                .rejects.toThrow('Series not found');
        });
    });

    // ========================================
    // SPECIFICATION: Basic CRUD (existing)
    // ========================================

    describe('Series List Contract', () => {
        it('MUST return empty array when no series exist', async () => {
            vi.mocked(tauriCommands.listSeries).mockResolvedValue([]);

            const result = await repo.list();

            expect(result).toEqual([]);
        });

        it('MUST return all series', async () => {
            vi.mocked(tauriCommands.listSeries).mockResolvedValue([
                createMockSeries({ id: 'series-1' }),
                createMockSeries({ id: 'series-2' }),
            ]);

            const result = await repo.list();

            expect(result).toHaveLength(2);
        });
    });

    describe('Series Get By Name Contract', () => {
        it('MUST find series by case-insensitive title match', async () => {
            vi.mocked(tauriCommands.listSeries).mockResolvedValue([
                createMockSeries({ id: 'series-1', title: 'Fantasy World' }),
            ]);

            const result = await repo.getByName('fantasy world');

            expect(result?.id).toBe('series-1');
        });

        it('MUST return undefined if no match', async () => {
            vi.mocked(tauriCommands.listSeries).mockResolvedValue([
                createMockSeries({ title: 'Fantasy World' }),
            ]);

            const result = await repo.getByName('Sci-Fi Universe');

            expect(result).toBeUndefined();
        });
    });
});
