import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock localStorage if needed
beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
});
