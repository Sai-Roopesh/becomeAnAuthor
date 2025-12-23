import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStorageQuota } from './use-storage-quota';

// Mock the storage quota service
vi.mock('@/infrastructure/services/storage-quota-service', () => ({
    storageQuotaService: {
        getQuota: vi.fn().mockResolvedValue({
            used: 1024 * 1024 * 50, // 50MB
            quota: 1024 * 1024 * 1024, // 1GB
            percentUsed: 0.05,
            isLow: false,
            isCritical: false,
        }),
    },
}));

describe('useStorageQuota', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null initially', () => {
        const { result } = renderHook(() => useStorageQuota());
        // Initial state before async resolves
        expect(result.current).toBeNull();
    });

    it('should return quota data after loading', async () => {
        const { result } = renderHook(() => useStorageQuota());

        await waitFor(() => {
            expect(result.current).not.toBeNull();
        });

        expect(result.current).toHaveProperty('used');
        expect(result.current).toHaveProperty('quota');
    });

    it('should have percentUsed property', async () => {
        const { result } = renderHook(() => useStorageQuota());

        await waitFor(() => {
            expect(result.current).not.toBeNull();
        });

        expect(result.current?.percentUsed).toBeDefined();
    });

    it('should have isLow and isCritical flags', async () => {
        const { result } = renderHook(() => useStorageQuota());

        await waitFor(() => {
            expect(result.current).not.toBeNull();
        });

        expect(result.current?.isLow).toBeDefined();
        expect(result.current?.isCritical).toBeDefined();
    });
});
