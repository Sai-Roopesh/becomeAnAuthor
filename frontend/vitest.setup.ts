import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// ============================================
// Browser API Mocks
// ============================================

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    takeRecords() {
        return [];
    }
    unobserve() { }
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
} as unknown as typeof ResizeObserver;

// ============================================
// Storage Mocks
// ============================================

// Mock localStorage
const localStorageData = new Map<string, string>();

const localStorageMock = {
    getItem: vi.fn((key: string) => localStorageData.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
        localStorageData.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
        localStorageData.delete(key);
    }),
    clear: vi.fn(() => {
        localStorageData.clear();
    }),
    get length() {
        return localStorageData.size;
    },
    key: vi.fn((index: number) => {
        const keys = Array.from(localStorageData.keys());
        return keys[index] ?? null;
    }),
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Clear localStorage between tests
afterEach(() => {
    localStorageData.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
});

// ============================================
// Tauri Mock (stub - import specific mocks in tests)
// ============================================

// Stub Tauri invoke to fail by default (tests should provide their own mocks)
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.reject(new Error('Tauri invoke not mocked for this test'))),
}));

// ============================================
// Console Suppressions (optional - remove if you want to see all logs)
// ============================================

// Suppress expected console errors in tests
const originalConsoleError = console.error;
console.error = (...args) => {
    // Suppress React act() warnings - we handle these properly
    if (typeof args[0] === 'string' && args[0].includes('act(...)')) {
        return;
    }
    originalConsoleError(...args);
};

