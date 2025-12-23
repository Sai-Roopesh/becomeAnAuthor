/**
 * Token Counter Tests
 * Tests for async token counting and tiktoken integration
 */

import { describe, it, expect } from 'vitest';
import {
    countTokens,
    countMessagesTokens,
} from '../token-counter';


describe('Token Counter', () => {
    describe('countTokens', () => {
        it('should estimate tokens based on character count', () => {
            const text = 'Hello world';
            const estimate = countTokens(text, 'gpt-4');
            // ~4 chars per token is the rough estimate
            expect(estimate).toBeGreaterThan(0);
            expect(estimate).toBeLessThan(text.length);
        });

        it('should return 0 for empty string', () => {
            expect(countTokens('', 'gpt-4')).toBe(0);
        });

        it('should handle whitespace strings', () => {
            expect(countTokens('   ', 'gpt-4')).toBeGreaterThan(0);
        });
    });

    describe('countTokens with different models', () => {
        it('should return an estimate when tiktoken is not available', () => {
            const text = 'This is a test sentence with multiple words.';
            const count = countTokens(text, 'gpt-4');
            expect(count).toBeGreaterThan(5);
            expect(count).toBeLessThan(50);
        });

        it('should handle long text', () => {
            const longText = 'word '.repeat(1000);
            const count = countTokens(longText, 'gpt-4');
            expect(count).toBeGreaterThan(100);
        });

        it('should return 0 for empty input', () => {
            expect(countTokens('', 'gpt-4')).toBe(0);
        });
    });

    describe('countMessagesTokens', () => {
        it('should count tokens across multiple messages', () => {
            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
            ];
            const count = countMessagesTokens(messages, 'gpt-4');
            expect(count).toBeGreaterThan(0);
        });

        it('should handle empty messages array', () => {
            expect(countMessagesTokens([], 'gpt-4')).toBe(2); // Just overhead
        });

        it('should include role tokens in count', () => {
            const singleMessage = [{ role: 'user', content: 'Hi' }];
            const count = countMessagesTokens(singleMessage, 'gpt-4');
            // Should be more than just content tokens due to role overhead
            expect(count).toBeGreaterThan(countTokens('Hi', 'gpt-4'));
        });
    });
});
