import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'first', delay: 500 } }
        );

        expect(result.current).toBe('first');

        // Change the value
        rerender({ value: 'second', delay: 500 });

        // Value should not change immediately
        expect(result.current).toBe('first');

        // Fast forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Now it should be updated
        expect(result.current).toBe('second');
    });

    it('should reset timer on rapid changes', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'a', delay: 500 } }
        );

        // Rapid changes
        rerender({ value: 'b', delay: 500 });
        act(() => { vi.advanceTimersByTime(200); });

        rerender({ value: 'c', delay: 500 });
        act(() => { vi.advanceTimersByTime(200); });

        rerender({ value: 'd', delay: 500 });

        // Should still be 'a' because timer keeps resetting
        expect(result.current).toBe('a');

        // Now wait full delay
        act(() => { vi.advanceTimersByTime(500); });

        // Should be the final value
        expect(result.current).toBe('d');
    });

    it('should work with different delay values', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'test', delay: 1000 } }
        );

        rerender({ value: 'changed', delay: 1000 });

        act(() => { vi.advanceTimersByTime(500); });
        expect(result.current).toBe('test');

        act(() => { vi.advanceTimersByTime(500); });
        expect(result.current).toBe('changed');
    });

    it('should work with object values', () => {
        const obj1 = { name: 'test' };
        const obj2 = { name: 'updated' };

        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: obj1, delay: 500 } }
        );

        expect(result.current).toBe(obj1);

        rerender({ value: obj2, delay: 500 });

        act(() => { vi.advanceTimersByTime(500); });

        expect(result.current).toBe(obj2);
    });
});
