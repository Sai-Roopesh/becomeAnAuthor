import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTabLeader } from './use-tab-leader';

// Mock the tab leader service
vi.mock('@/lib/services/tab-leader-service', () => ({
    tabLeaderService: {
        getIsLeader: vi.fn().mockReturnValue(true),
        getTabId: vi.fn().mockReturnValue('test-tab-123'),
        onLeadershipChange: vi.fn().mockReturnValue(() => { }),
    },
}));

describe('useTabLeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return isLeader boolean', () => {
        const { result } = renderHook(() => useTabLeader());
        expect(typeof result.current.isLeader).toBe('boolean');
    });

    it('should return tabId string', () => {
        const { result } = renderHook(() => useTabLeader());
        expect(typeof result.current.tabId).toBe('string');
    });

    it('should default to leader when service returns true', () => {
        const { result } = renderHook(() => useTabLeader());
        expect(result.current.isLeader).toBe(true);
    });

    it('should return tabId from service', () => {
        const { result } = renderHook(() => useTabLeader());
        expect(result.current.tabId).toBe('test-tab-123');
    });

    it('should maintain consistent return values', () => {
        const { result, rerender } = renderHook(() => useTabLeader());

        const first = result.current;
        rerender();
        const second = result.current;

        // Values should be stable
        expect(first.isLeader).toBe(second.isLeader);
    });
});
