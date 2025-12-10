import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/**
 * Test Providers Wrapper
 * Wraps components with necessary providers for testing
 */
function AllProviders({ children }: { children: ReactNode }) {
    return (
        <>
            {children}
        </>
    );
}

/**
 * Custom render function with providers
 */
function customRender(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return {
        user: userEvent.setup(),
        ...render(ui, { wrapper: AllProviders, ...options }),
    };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };

/**
 * Mock storage for tests
 */
export const mockStorage = {
    data: new Map<string, string>(),
    getItem: (key: string) => mockStorage.data.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.data.set(key, value),
    removeItem: (key: string) => mockStorage.data.delete(key),
    clear: () => mockStorage.data.clear(),
};

/**
 * Mock toast for tests
 */
export const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
};

/**
 * Create a mock function that resolves after delay
 */
export function createDelayedMock<T>(value: T, delay = 100) {
    return vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(value), delay))
    );
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
    condition: () => boolean,
    timeout = 5000,
    interval = 50
): Promise<void> {
    const start = Date.now();
    while (!condition()) {
        if (Date.now() - start > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
}

/**
 * Flush all pending promises
 */
export function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
