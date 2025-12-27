/**
 * Token Calculator Tests
 * TDD: Tests written BEFORE implementation
 * 
 * @see docs/TESTING_GUIDE.md for testing conventions
 */

import { describe, it, expect } from 'vitest';
import {
    calculateTokenBudget,
    wordsToTokens,
    isReasoningModel,
    type ReasoningMode,
    type TokenBudget,
} from '../token-calculator';

describe('Token Calculator', () => {

    // ========================================
    // SPEC: wordsToTokens
    // ========================================
    describe('wordsToTokens', () => {
        it('MUST convert 1000 words to 1300 tokens', () => {
            expect(wordsToTokens(1000)).toBe(1300);
        });

        it('MUST convert 500 words to 650 tokens', () => {
            expect(wordsToTokens(500)).toBe(650);
        });

        it('MUST convert 200 words to 260 tokens', () => {
            expect(wordsToTokens(200)).toBe(260);
        });

        it('MUST round up fractional tokens', () => {
            expect(wordsToTokens(100)).toBe(130);
            expect(wordsToTokens(1)).toBe(2); // 1.3 rounds up to 2
        });

        it('MUST handle zero words', () => {
            expect(wordsToTokens(0)).toBe(0);
        });
    });

    // ========================================
    // SPEC: isReasoningModel
    // ========================================
    describe('isReasoningModel', () => {
        describe('Gemini models', () => {
            it('MUST identify Gemini 2.5 as reasoning model', () => {
                expect(isReasoningModel('gemini-2.5-flash')).toBe(true);
                expect(isReasoningModel('gemini-2.5-pro')).toBe(true);
                expect(isReasoningModel('google/gemini-2.5-flash')).toBe(true);
            });

            it('MUST identify Gemini 3 as reasoning model', () => {
                expect(isReasoningModel('gemini-3-flash')).toBe(true);
                expect(isReasoningModel('gemini-3-pro')).toBe(true);
            });

            it('MUST identify thinking models as reasoning', () => {
                expect(isReasoningModel('gemini-2.0-flash-thinking-exp')).toBe(true);
            });

            it('MUST NOT identify Gemini 1.5 as reasoning model', () => {
                expect(isReasoningModel('gemini-1.5-pro')).toBe(false);
                expect(isReasoningModel('gemini-1.5-flash')).toBe(false);
            });
        });

        describe('OpenAI models', () => {
            it('MUST identify o1/o3 as reasoning model', () => {
                expect(isReasoningModel('o1-preview')).toBe(true);
                expect(isReasoningModel('o1-mini')).toBe(true);
                expect(isReasoningModel('o3-preview')).toBe(true);
            });

            it('MUST NOT identify GPT-4o as reasoning model', () => {
                expect(isReasoningModel('gpt-4o')).toBe(false);
                expect(isReasoningModel('gpt-4-turbo')).toBe(false);
                expect(isReasoningModel('gpt-3.5-turbo')).toBe(false);
            });
        });

        describe('Claude models', () => {
            it('MUST identify Claude 3.7+ as reasoning model', () => {
                expect(isReasoningModel('claude-3.7-sonnet')).toBe(true);
                expect(isReasoningModel('claude-4-sonnet')).toBe(true);
                expect(isReasoningModel('claude-4-opus')).toBe(true);
            });

            it('MUST NOT identify Claude 3.5 as reasoning model', () => {
                expect(isReasoningModel('claude-3.5-sonnet')).toBe(false);
                expect(isReasoningModel('claude-3-opus')).toBe(false);
            });
        });
    });

    // ========================================
    // SPEC: calculateTokenBudget - Reasoning ENABLED
    // ========================================
    describe('calculateTokenBudget with reasoning ENABLED', () => {

        describe('Gemini 2.5', () => {
            it('MUST add thinkingBudget to maxOutputTokens', () => {
                const budget = calculateTokenBudget({
                    model: 'gemini-2.5-flash',
                    words: 1000,
                    reasoning: 'enabled',
                });

                // 8192 (thinking) + 1300 (output) = 9492
                expect(budget.maxOutputTokens).toBe(8192 + 1300);
                expect(budget.thinkingBudget).toBe(8192);
            });

            it('MUST work with prefixed model names', () => {
                const budget = calculateTokenBudget({
                    model: 'google/gemini-2.5-flash',
                    words: 500,
                    reasoning: 'enabled',
                });

                expect(budget.thinkingBudget).toBe(8192);
                expect(budget.maxOutputTokens).toBe(8192 + 650);
            });
        });

        describe('Gemini 3', () => {
            it('MUST use thinkingLevel high', () => {
                const budget = calculateTokenBudget({
                    model: 'gemini-3-flash',
                    words: 1000,
                    reasoning: 'enabled',
                });

                expect(budget.thinkingLevel).toBe('high');
                expect(budget.thinkingBudget).toBeUndefined();
            });
        });

        describe('Claude 3.7+', () => {
            it('MUST enable extended thinking', () => {
                const budget = calculateTokenBudget({
                    model: 'claude-3.7-sonnet',
                    words: 1000,
                    reasoning: 'enabled',
                });

                expect(budget.thinking?.type).toBe('enabled');
                expect(budget.thinking?.budgetTokens).toBe(4096);
                expect(budget.maxTokens).toBe(4096 + 1300);
            });

            it('MUST work with Claude 4', () => {
                const budget = calculateTokenBudget({
                    model: 'claude-4-sonnet',
                    words: 500,
                    reasoning: 'enabled',
                });

                expect(budget.thinking?.type).toBe('enabled');
            });
        });

        describe('OpenAI o1/o3', () => {
            it('MUST use reasoning_effort high', () => {
                const budget = calculateTokenBudget({
                    model: 'o1-preview',
                    words: 1000,
                    reasoning: 'enabled',
                });

                expect(budget.reasoningEffort).toBe('high');
                expect(budget.maxCompletionTokens).toBeGreaterThanOrEqual(25000 + 1300);
            });

            it('MUST include warning about shared token limit', () => {
                const budget = calculateTokenBudget({
                    model: 'o1-preview',
                    words: 1000,
                    reasoning: 'enabled',
                });

                expect(budget.warning).toBeDefined();
                expect(budget.warning).toContain('token');
            });
        });
    });

    // ========================================
    // SPEC: calculateTokenBudget - Reasoning DISABLED
    // ========================================
    describe('calculateTokenBudget with reasoning DISABLED', () => {

        describe('Gemini 2.5', () => {
            it('MUST set thinkingBudget to 0', () => {
                const budget = calculateTokenBudget({
                    model: 'gemini-2.5-flash',
                    words: 1000,
                    reasoning: 'disabled',
                });

                expect(budget.maxOutputTokens).toBe(1300);
                expect(budget.thinkingBudget).toBe(0);
            });
        });

        describe('Gemini 3', () => {
            it('MUST use thinkingLevel minimal', () => {
                const budget = calculateTokenBudget({
                    model: 'gemini-3-flash',
                    words: 1000,
                    reasoning: 'disabled',
                });

                expect(budget.thinkingLevel).toBe('minimal');
            });
        });

        describe('Claude 3.7+', () => {
            it('MUST NOT include thinking object', () => {
                const budget = calculateTokenBudget({
                    model: 'claude-3.7-sonnet',
                    words: 1000,
                    reasoning: 'disabled',
                });

                expect(budget.thinking).toBeUndefined();
                expect(budget.maxTokens).toBe(1300);
            });
        });

        describe('OpenAI o1/o3', () => {
            it('MUST use reasoning_effort low', () => {
                const budget = calculateTokenBudget({
                    model: 'o1-preview',
                    words: 1000,
                    reasoning: 'disabled',
                });

                expect(budget.reasoningEffort).toBe('low');
            });
        });
    });

    // ========================================
    // SPEC: Non-reasoning models
    // ========================================
    describe('Non-reasoning models', () => {
        it('GPT-4o: MUST ignore reasoning parameter', () => {
            const enabled = calculateTokenBudget({
                model: 'gpt-4o',
                words: 1000,
                reasoning: 'enabled',
            });

            const disabled = calculateTokenBudget({
                model: 'gpt-4o',
                words: 1000,
                reasoning: 'disabled',
            });

            expect(enabled.maxTokens).toBe(1300);
            expect(disabled.maxTokens).toBe(1300);
        });

        it('Gemini 1.5 Pro: MUST ignore reasoning parameter', () => {
            const budget = calculateTokenBudget({
                model: 'gemini-1.5-pro',
                words: 500,
                reasoning: 'enabled',
            });

            expect(budget.maxOutputTokens).toBe(650);
            expect(budget.thinkingBudget).toBeUndefined();
        });

        it('Claude 3.5: MUST ignore reasoning parameter', () => {
            const budget = calculateTokenBudget({
                model: 'claude-3.5-sonnet',
                words: 500,
                reasoning: 'enabled',
            });

            expect(budget.maxTokens).toBe(650);
            expect(budget.thinking).toBeUndefined();
        });
    });

    // ========================================
    // SPEC: Edge cases
    // ========================================
    describe('Edge cases', () => {
        it('MUST respect model max output limits', () => {
            const budget = calculateTokenBudget({
                model: 'gemini-2.5-flash',
                words: 50000, // Very large
                reasoning: 'enabled',
            });

            // Gemini 2.5 Flash max is 65536
            expect(budget.maxOutputTokens).toBeLessThanOrEqual(65536);
        });

        it('MUST include expectedOutputTokens in result', () => {
            const budget = calculateTokenBudget({
                model: 'gpt-4o',
                words: 1000,
                reasoning: 'disabled',
            });

            expect(budget.expectedOutputTokens).toBe(1300);
        });
    });
});
