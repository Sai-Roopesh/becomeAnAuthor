import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContextAssembly } from './use-context-assembly';

// Mock all dependencies
vi.mock('./use-node-repository', () => ({
    useNodeRepository: () => ({
        getByProject: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        getChildren: vi.fn().mockResolvedValue([]),
    }),
}));

vi.mock('./use-codex-repository', () => ({
    useCodexRepository: () => ({
        get: vi.fn().mockResolvedValue(null),
    }),
}));

describe('useContextAssembly', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return assembleContext and clearCache functions', () => {
        const { result } = renderHook(() => useContextAssembly('project-123'));

        expect(result.current.assembleContext).toBeDefined();
        expect(result.current.clearCache).toBeDefined();
        expect(typeof result.current.assembleContext).toBe('function');
        expect(typeof result.current.clearCache).toBe('function');
    });

    it('should return empty string for empty context array', async () => {
        const { result } = renderHook(() => useContextAssembly('project-123'));

        let context: string = '';
        await act(async () => {
            context = await result.current.assembleContext([]);
        });

        expect(context).toBe('');
    });

    it('should handle clearCache without error', () => {
        const { result } = renderHook(() => useContextAssembly('project-123'));

        expect(() => {
            act(() => {
                result.current.clearCache();
            });
        }).not.toThrow();
    });

    it('should memoize functions across rerenders', () => {
        const { result, rerender } = renderHook(() =>
            useContextAssembly('project-123')
        );

        const firstAssemble = result.current.assembleContext;
        const firstClearCache = result.current.clearCache;

        rerender();

        expect(result.current.assembleContext).toBe(firstAssemble);
        expect(result.current.clearCache).toBe(firstClearCache);
    });
});
