import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getValidatedModel, formatAIError, buildAIPrompt, persistModelSelection } from '@/shared/utils/ai-utils';
import { storage } from '@/core/storage/safe-storage';
import { STORAGE_KEYS } from '@/lib/config/constants';

// Mock storage
vi.mock('@/core/storage/safe-storage', () => ({
    storage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
    },
}));

describe('ai-utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getValidatedModel', () => {
        it('should return preferred model if provided', () => {
            const result = getValidatedModel('gpt-4');
            expect(result).toEqual({ model: 'gpt-4', isValid: true });
        });

        it('should return last used model from storage', () => {
            vi.mocked(storage.getItem).mockReturnValue('claude-3');
            const result = getValidatedModel();
            expect(result).toEqual({ model: 'claude-3', isValid: true });
        });

        it('should load from AI connections if no last used', () => {
            vi.mocked(storage.getItem)
                .mockReturnValueOnce('') // last_used_model
                .mockReturnValueOnce([
                    { enabled: true, models: ['gemini-pro'] },
                ]); // ai_connections

            const result = getValidatedModel();
            expect(result).toEqual({ model: 'gemini-pro', isValid: true });
        });

        it('should return invalid if no model available', () => {
            vi.mocked(storage.getItem).mockReturnValue('');
            vi.mocked(storage.getItem).mockReturnValueOnce('').mockReturnValueOnce([]);

            const result = getValidatedModel();
            expect(result).toEqual({ model: '', isValid: false });
        });
    });

    describe('formatAIError', () => {
        it('should suppress cancellation errors', () => {
            const error = new Error('Request was cancelled');
            const result = formatAIError(error, 'Test');
            expect(result).toBe('');
        });

        it('should format API key errors', () => {
            const error = new Error('Invalid API key');
            const result = formatAIError(error, 'Test');
            expect(result).toContain('API key');
        });

        it('should format rate limit errors', () => {
            const error = new Error('rate limit exceeded');
            const result = formatAIError(error, 'Test');
            expect(result).toContain('Rate limit');
        });

        it('should format timeout errors', () => {
            const error = new Error('Request timed out');
            const result = formatAIError(error, 'Test');
            expect(result).toContain('timed out');
        });

        it('should format generic errors with operation name', () => {
            const error = new Error('Something went wrong');
            const result = formatAIError(error, 'Generation');
            expect(result).toContain('Generation failed');
            expect(result).toContain('Something went wrong');
        });
    });

    describe('buildAIPrompt', () => {
        it('should build prompt without context', () => {
            const result = buildAIPrompt({
                prompt: 'Test prompt',
            });

            expect(result.prompt).toBe('Test prompt');
            expect(result.system).toBe('You are a helpful creative writing assistant.');
        });

        it('should build prompt with context', () => {
            const result = buildAIPrompt({
                prompt: 'Continue the story',
                context: 'Once upon a time...',
            });

            expect(result.prompt).toContain('Context:');
            expect(result.prompt).toContain('Once upon a time...');
            expect(result.prompt).toContain('Continue the story');
        });

        it('should trim context to limit', () => {
            const longContext = 'a'.repeat(10000);
            const result = buildAIPrompt({
                prompt: 'Test',
                context: longContext,
                contextLimit: 100,
            });

            // Should truncate to last 100 chars
            expect(result.prompt.length).toBeLessThan(longContext.length + 100);
        });

        it('should use custom system prompt', () => {
            const result = buildAIPrompt({
                prompt: 'Test',
                system: 'Custom system',
            });

            expect(result.system).toBe('Custom system');
        });
    });

    describe('persistModelSelection', () => {
        it('should save model to storage', () => {
            persistModelSelection('gpt-4');
            expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.LAST_USED_MODEL, 'gpt-4');
        });

        it('should not save empty model', () => {
            persistModelSelection('');
            expect(storage.setItem).not.toHaveBeenCalled();
        });
    });
});
