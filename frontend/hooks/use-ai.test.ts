/**
 * Example test for use-ai hook
 * Demonstrates testing patterns for custom React hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAI } from './use-ai';

// Mock the storage
vi.mock('@/core/storage/safe-storage', () => ({
    storage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
    },
}));

// Mock the invoke function
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock ai-utils to provide getValidatedModel
vi.mock('@/shared/utils/ai-utils', () => ({
    getValidatedModel: vi.fn().mockReturnValue({ model: '', isValid: false }),
    formatAIError: vi.fn().mockReturnValue(''),
    buildAIPrompt: vi.fn().mockReturnValue({ system: '', prompt: '' }),
    persistModelSelection: vi.fn(),
}));

describe('useAI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useAI({
            system: 'Test system prompt',
        }));

        expect(result.current.isGenerating).toBe(false);
        expect(result.current.model).toBe('');
    });

    it('should handle model selection', () => {
        const { result } = renderHook(() => useAI({
            system: 'Test system prompt',
            persistModel: false,
        }));

        act(() => {
            result.current.setModel('gpt-4');
        });

        expect(result.current.model).toBe('gpt-4');
    });

    // Add more tests as needed
});
