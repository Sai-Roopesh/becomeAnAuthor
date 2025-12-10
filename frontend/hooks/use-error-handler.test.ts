import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from './use-error-handler';

// Mock toast service
vi.mock('@/shared/utils/toast-service', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

// Get the mocked toast
import { toast } from '@/shared/utils/toast-service';
const mockToast = vi.mocked(toast);

describe('useErrorHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should return handleError function', () => {
        const { result } = renderHook(() => useErrorHandler());
        expect(result.current.handleError).toBeDefined();
        expect(typeof result.current.handleError).toBe('function');
    });

    it('should handle Error objects', () => {
        const { result } = renderHook(() => useErrorHandler());
        const testError = new Error('Test error message');

        act(() => {
            result.current.handleError(testError);
        });

        expect(mockToast.error).toHaveBeenCalledWith('Error', {
            description: 'Test error message',
        });
    });

    it('should handle non-Error values', () => {
        const { result } = renderHook(() => useErrorHandler());

        act(() => {
            result.current.handleError('String error');
        });

        expect(mockToast.error).toHaveBeenCalledWith('Error', {
            description: 'String error',
        });
    });

    it('should log to console when enabled', () => {
        const originalEnv = process.env['NODE_ENV'];
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

        const { result } = renderHook(() =>
            useErrorHandler({ logToConsole: true })
        );
        const testError = new Error('Console test');

        act(() => {
            result.current.handleError(testError, 'TestContext');
        });

        expect(console.error).toHaveBeenCalledWith(
            'Error in TestContext:',
            testError
        );

        Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    });

    it('should not show toast when disabled', () => {
        const { result } = renderHook(() =>
            useErrorHandler({ showToast: false })
        );

        act(() => {
            result.current.handleError(new Error('No toast'));
        });

        expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('should call custom onError callback', () => {
        const customHandler = vi.fn();
        const { result } = renderHook(() =>
            useErrorHandler({ onError: customHandler })
        );
        const testError = new Error('Custom handler test');

        act(() => {
            result.current.handleError(testError);
        });

        expect(customHandler).toHaveBeenCalledWith(testError);
    });

    it('should return the error object', () => {
        const { result } = renderHook(() => useErrorHandler({ showToast: false }));
        const testError = new Error('Return test');
        let returnedError: Error | undefined;

        act(() => {
            returnedError = result.current.handleError(testError);
        });

        expect(returnedError).toBe(testError);
    });

    it('should handle errors with context string', () => {
        const originalEnv = process.env['NODE_ENV'];
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

        const { result } = renderHook(() => useErrorHandler());
        const testError = new Error('Context test');

        act(() => {
            result.current.handleError(testError, 'SaveOperation');
        });

        expect(console.error).toHaveBeenCalledWith(
            'Error in SaveOperation:',
            testError
        );

        Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    });

    it('should be memoized with useCallback', () => {
        const { result, rerender } = renderHook(() => useErrorHandler());
        const firstHandleError = result.current.handleError;

        rerender();
        const secondHandleError = result.current.handleError;

        expect(firstHandleError).toBe(secondHandleError);
    });
});
