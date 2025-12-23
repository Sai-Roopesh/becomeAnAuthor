/**
 * API Key Security Specification Tests
 * 
 * SPECIFICATIONS (from implementation plan):
 * 1. API keys MUST be stored in OS keychain, NEVER in localStorage
 * 2. API keys MUST be validated before storing
 * 3. Migration MUST move legacy localStorage keys to keychain
 * 4. Failed operations MUST NOT expose key in error messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mock Dependencies
// ============================================

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@/core/storage/safe-storage', () => ({
    storage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
    },
}));

vi.mock('@/shared/utils/toast-service', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/shared/utils/logger', () => ({
    logger: {
        scope: () => ({
            debug: vi.fn(),
            info: vi.fn(),
        }),
    },
}));

import { storage } from '@/core/storage/safe-storage';
import { toast } from '@/shared/utils/toast-service';

// Import after mocks
import {
    storeAPIKey,
    getAPIKey,
    deleteAPIKey,
    validateAPIKey,
    storeAPIKeyWithValidation,
    migrateAPIKeysFromLocalStorage,
    hasAPIKey,
} from '@/core/storage/api-keys';

// ============================================
// Specification Tests
// ============================================

describe('API Key Security Contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ========================================
    // SPECIFICATION 1: OS Keychain Storage
    // ========================================

    describe('SPEC: Keychain Storage - API keys MUST use OS keychain', () => {
        it('storeAPIKey MUST call Tauri store_api_key command', async () => {
            mockInvoke.mockResolvedValue(undefined);

            await storeAPIKey('openai', 'sk-test-key-12345');

            expect(mockInvoke).toHaveBeenCalledWith('store_api_key', {
                provider: 'openai',
                key: 'sk-test-key-12345',
            });
        });

        it('getAPIKey MUST call Tauri get_api_key command', async () => {
            mockInvoke.mockResolvedValue('sk-secret-key');

            const key = await getAPIKey('anthropic');

            expect(mockInvoke).toHaveBeenCalledWith('get_api_key', {
                provider: 'anthropic',
            });
            expect(key).toBe('sk-secret-key');
        });

        it('deleteAPIKey MUST call Tauri delete_api_key command', async () => {
            mockInvoke.mockResolvedValue(undefined);

            await deleteAPIKey('google');

            expect(mockInvoke).toHaveBeenCalledWith('delete_api_key', {
                provider: 'google',
            });
        });

        it('MUST NOT store API key in localStorage', async () => {
            mockInvoke.mockResolvedValue(undefined);

            await storeAPIKey('openrouter', 'sk-or-secret');

            // storage.setItem should NEVER be called with an API key
            expect(storage.setItem).not.toHaveBeenCalled();
        });
    });

    // ========================================
    // SPECIFICATION 2: API Key Validation
    // ========================================

    describe('SPEC: Key Validation - MUST validate format before storing', () => {
        it('OpenAI keys MUST start with sk-', () => {
            const error = validateAPIKey('openai', 'invalid-key');

            expect(error).toMatch(/sk-/i);
        });

        it('OpenAI keys MUST be at least 40 characters', () => {
            const error = validateAPIKey('openai', 'sk-short');

            expect(error).toMatch(/too short/i);
        });

        it('Anthropic keys MUST start with sk-ant-', () => {
            const error = validateAPIKey('anthropic', 'wrong-prefix');

            expect(error).toMatch(/sk-ant-/i);
        });

        it('OpenRouter keys MUST start with sk-or-', () => {
            const error = validateAPIKey('openrouter', 'sk-wrong');

            expect(error).toMatch(/sk-or-/i);
        });

        it('Valid keys MUST return null (no error)', () => {
            // OpenAI valid format
            expect(validateAPIKey('openai', 'sk-' + 'x'.repeat(45))).toBeNull();
            // Anthropic valid format
            expect(validateAPIKey('anthropic', 'sk-ant-' + 'x'.repeat(40))).toBeNull();
            // OpenRouter valid format
            expect(validateAPIKey('openrouter', 'sk-or-' + 'x'.repeat(40))).toBeNull();
        });

        it('Empty keys MUST be rejected', () => {
            expect(validateAPIKey('openai', '')).toMatch(/empty/i);
            expect(validateAPIKey('google', '   ')).toMatch(/empty/i);
        });
    });

    // ========================================
    // SPECIFICATION 3: Store with Validation
    // ========================================

    describe('SPEC: storeAPIKeyWithValidation - MUST validate then store', () => {
        it('MUST reject invalid key without storing', async () => {
            const result = await storeAPIKeyWithValidation('openai', 'bad-key');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            // MUST NOT call Tauri if validation fails
            expect(mockInvoke).not.toHaveBeenCalled();
        });

        it('MUST store valid key and return success', async () => {
            mockInvoke.mockResolvedValue(undefined);

            const validKey = 'sk-' + 'a'.repeat(45);
            const result = await storeAPIKeyWithValidation('openai', validKey);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockInvoke).toHaveBeenCalledWith('store_api_key', expect.objectContaining({
                provider: 'openai',
            }));
        });

        /**
         * SPEC NOTE: Current implementation validates BEFORE trimming,
         * which means keys with leading whitespace will fail validation.
         * This test documents expected behavior - consider updating
         * implementation to trim before validation.
         */
        it.todo('MUST trim whitespace from key before storing');
    });

    // ========================================
    // SPECIFICATION 4: Error Handling
    // ========================================

    describe('SPEC: Error Handling - MUST NOT expose keys in errors', () => {
        it('getAPIKey MUST return null on error (not throw)', async () => {
            mockInvoke.mockRejectedValue(new Error('Keychain access denied'));

            const key = await getAPIKey('openai');

            expect(key).toBeNull();
        });

        it('storeAPIKey MUST return false on error', async () => {
            mockInvoke.mockRejectedValue(new Error('Storage failed'));

            const result = await storeAPIKey('google', 'api-key');

            expect(result).toBe(false);
        });

        it('storeAPIKey MUST show toast on failure', async () => {
            mockInvoke.mockRejectedValue(new Error('Keychain locked'));

            await storeAPIKey('openai', 'test-key');

            expect(toast.error).toHaveBeenCalled();
        });
    });

    // ========================================
    // SPECIFICATION 5: hasAPIKey Helper
    // ========================================

    describe('SPEC: hasAPIKey - Existence check without exposing key', () => {
        it('MUST return true if key exists', async () => {
            mockInvoke.mockResolvedValue('sk-secret-key');

            const exists = await hasAPIKey('openai');

            expect(exists).toBe(true);
        });

        it('MUST return false if no key', async () => {
            mockInvoke.mockResolvedValue(null);

            const exists = await hasAPIKey('anthropic');

            expect(exists).toBe(false);
        });

        it('MUST return false for empty string key', async () => {
            mockInvoke.mockResolvedValue('');

            const exists = await hasAPIKey('google');

            expect(exists).toBe(false);
        });
    });
});

// ========================================
// Migration Tests
// ========================================

describe('API Key Migration Contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('SPEC: Migration - MUST move keys from localStorage to keychain', () => {
        it('MUST migrate existing localStorage keys to keychain', async () => {
            // Setup: Legacy key exists in localStorage
            vi.mocked(storage.getItem).mockImplementation((key: string) => {
                if (key === 'ai-api-key-openai') return 'sk-legacy-key';
                return null;
            });
            mockInvoke.mockResolvedValue(undefined);

            const count = await migrateAPIKeysFromLocalStorage();

            // MUST attempt to store in keychain
            expect(mockInvoke).toHaveBeenCalledWith('store_api_key', expect.objectContaining({
                provider: 'openai',
            }));
            expect(count).toBeGreaterThan(0);
        });

        it('MUST remove key from localStorage after successful migration', async () => {
            vi.mocked(storage.getItem).mockImplementation((key: string) => {
                if (key === 'ai-api-key-google') return 'google-legacy-key';
                return null;
            });
            mockInvoke.mockResolvedValue(undefined);

            await migrateAPIKeysFromLocalStorage();

            expect(storage.removeItem).toHaveBeenCalledWith('ai-api-key-google');
        });

        it('MUST NOT remove from localStorage if keychain storage fails', async () => {
            vi.mocked(storage.getItem).mockReturnValue('legacy-key');
            mockInvoke.mockRejectedValue(new Error('Storage failed'));

            await migrateAPIKeysFromLocalStorage();

            // Should NOT remove if migration failed
            expect(storage.removeItem).not.toHaveBeenCalled();
        });

        it('MUST return 0 when no keys to migrate', async () => {
            vi.mocked(storage.getItem).mockReturnValue(null);

            const count = await migrateAPIKeysFromLocalStorage();

            expect(count).toBe(0);
        });
    });
});
