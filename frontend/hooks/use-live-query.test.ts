import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLiveQuery, invalidateQueries } from './use-live-query';

describe('useLiveQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return undefined initially', () => {
        const mockQueryFn = vi.fn().mockResolvedValue([{ id: 1 }]);

        const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

        // Initially undefined before async resolves
        expect(result.current).toBeUndefined();
    });

    it('should return data after query resolves', async () => {
        const mockData = [{ id: '1', name: 'Test' }];
        const mockQueryFn = vi.fn().mockResolvedValue(mockData);

        const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

        await waitFor(() => {
            expect(result.current).toEqual(mockData);
        });
    });

    it('should call query function with dependencies', async () => {
        const mockQueryFn = vi.fn().mockResolvedValue([]);

        renderHook(() => useLiveQuery(mockQueryFn, ['dep1', 'dep2']));

        await waitFor(() => {
            expect(mockQueryFn).toHaveBeenCalled();
        });
    });

    it('should handle sync query functions', async () => {
        const syncData = { sync: true };
        const mockQueryFn = vi.fn().mockReturnValue(syncData);

        const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

        await waitFor(() => {
            expect(result.current).toEqual(syncData);
        });
    });

    it('should refetch when dependencies change', async () => {
        const mockQueryFn = vi.fn()
            .mockResolvedValueOnce([{ id: '1' }])
            .mockResolvedValueOnce([{ id: '2' }]);

        const { result, rerender } = renderHook(
            ({ dep }) => useLiveQuery(mockQueryFn, [dep]),
            { initialProps: { dep: 'first' } }
        );

        await waitFor(() => {
            expect(result.current).toEqual([{ id: '1' }]);
        });

        // Change dependency
        rerender({ dep: 'second' });

        await waitFor(() => {
            expect(mockQueryFn).toHaveBeenCalledTimes(2);
        });
    });

    it('should have invalidateQueries export', () => {
        expect(invalidateQueries).toBeDefined();
        expect(typeof invalidateQueries).toBe('function');
    });
});
