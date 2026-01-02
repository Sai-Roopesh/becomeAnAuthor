/**
 * Token Calculator
 * Handles proper token budget calculation for reasoning models
 * 
 * KEY FORMULA:
 * When reasoning enabled:  maxOutputTokens = thinkingBudget + outputTokens
 * When reasoning disabled: maxOutputTokens = outputTokens
 * 
 * @module lib/ai/token-calculator
 * @see docs/CODING_GUIDELINES.md
 */

// ========================================
// Types
// ========================================

export type ReasoningMode = 'enabled' | 'disabled';

export interface TokenBudgetInput {
    model: string;
    words: number;
    reasoning: ReasoningMode;
}

export interface TokenBudget {
    // Gemini
    maxOutputTokens?: number;
    thinkingBudget?: number;
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';

    // Claude
    maxTokens?: number;
    thinking?: {
        type: 'enabled';
        budgetTokens: number;
    };

    // OpenAI
    maxCompletionTokens?: number;
    reasoningEffort?: 'low' | 'medium' | 'high';

    // Metadata
    expectedOutputTokens: number;
    warning?: string;
}

// ========================================
// Constants
// ========================================

const WORDS_TO_TOKENS_RATIO = 1.3;

const DEFAULT_THINKING_BUDGETS = {
    google: 8192,
    anthropic: 4096,
    openai: 25000,
} as const;

const MODEL_MAX_OUTPUT: Record<string, number> = {
    'gemini-2.5-flash': 65536,
    'gemini-2.5-pro': 65536,
    'gemini-3-flash': 65536,
    'gemini-3-pro': 65536,
    'claude-3.7-sonnet': 8192,
    'claude-4-sonnet': 128000,
    'claude-4-opus': 128000,
    'o1-preview': 100000,
    'o1-mini': 65536,
    'o3-preview': 100000,
    'gpt-4o': 16384,
    'gpt-4-turbo': 4096,
};

// ========================================
// Functions
// ========================================

/**
 * Convert word count to token count
 * Rule: 1 word ≈ 1.3 tokens (English average)
 */
export function wordsToTokens(words: number): number {
    if (words === 0) return 0;
    return Math.ceil(words * WORDS_TO_TOKENS_RATIO);
}

/**
 * Detect if model has reasoning/thinking capabilities
 * 
 * Reasoning models:
 * - Gemini 2.5+, Gemini 3.x
 * - OpenAI o1, o3
 * - Claude 3.7+, Claude 4.x
 */
export function isReasoningModel(model: string): boolean {
    const m = model.toLowerCase();

    // Gemini thinking models (2.5+ or explicit thinking)
    if (m.includes('gemini-2.5') || m.includes('gemini-3') || m.includes('-thinking-')) {
        return true;
    }

    // OpenAI reasoning models
    if (m.includes('o1-') || m.includes('o3-')) {
        return true;
    }

    // Claude extended thinking models (3.7+ or 4.x)
    if (m.includes('claude-3.7') || m.includes('claude-4')) {
        return true;
    }

    return false;
}

/**
 * Get vendor from model name
 */
function getVendor(model: string): 'google' | 'anthropic' | 'openai' | 'other' {
    const m = model.toLowerCase();
    if (m.includes('gemini')) return 'google';
    if (m.includes('claude')) return 'anthropic';
    if (m.includes('gpt') || m.includes('o1-') || m.includes('o3-')) return 'openai';
    return 'other';
}

/**
 * Get Gemini version from model name
 */
function getGeminiVersion(model: string): '2.5' | '3' | 'other' {
    const m = model.toLowerCase();
    if (m.includes('2.5')) return '2.5';
    if (m.includes('gemini-3')) return '3';
    return 'other';
}

/**
 * Get model's maximum output token limit
 */
function getModelMaxOutput(model: string): number {
    const m = model.toLowerCase();
    for (const [key, value] of Object.entries(MODEL_MAX_OUTPUT)) {
        if (m.includes(key)) return value;
    }
    return 4096; // Conservative default
}

/**
 * Calculate comprehensive token budget for AI generation
 * 
 * This is the core function that ensures users get the word count they request
 * while allowing models to use reasoning when enabled.
 * 
 * @example
 * // User wants 1000 words with reasoning
 * const budget = calculateTokenBudget({
 *     model: 'gemini-2.5-flash',
 *     words: 1000,
 *     reasoning: 'enabled',
 * });
 * // budget.maxOutputTokens = 9492 (8192 thinking + 1300 output)
 */
export function calculateTokenBudget(input: TokenBudgetInput): TokenBudget {
    const { model, words, reasoning } = input;
    const outputTokens = wordsToTokens(words);
    const vendor = getVendor(model);
    const modelMax = getModelMaxOutput(model);
    const enabled = reasoning === 'enabled';
    const hasReasoning = isReasoningModel(model);

    const budget: TokenBudget = {
        expectedOutputTokens: outputTokens,
    };

    // Non-reasoning models: just return output tokens
    if (!hasReasoning) {
        if (vendor === 'anthropic') {
            budget.maxTokens = Math.min(outputTokens, modelMax);
        } else {
            budget.maxOutputTokens = Math.min(outputTokens, modelMax);
            budget.maxTokens = Math.min(outputTokens, modelMax);
        }
        return budget;
    }

    switch (vendor) {
        case 'google': {
            const geminiVersion = getGeminiVersion(model);

            if (geminiVersion === '3') {
                // Gemini 3: use thinkingLevel (not thinkingBudget)
                budget.thinkingLevel = enabled ? 'high' : 'minimal';
                budget.maxOutputTokens = Math.min(
                    enabled ? outputTokens * 2 : outputTokens,
                    modelMax
                );
            } else if (geminiVersion === '2.5') {
                // Gemini 2.5: use thinkingBudget
                // KEY FORMULA: maxOutputTokens = thinkingBudget + outputTokens
                const thinkingBudget = enabled ? DEFAULT_THINKING_BUDGETS.google : 0;
                budget.thinkingBudget = thinkingBudget;
                budget.maxOutputTokens = Math.min(
                    thinkingBudget + outputTokens,
                    modelMax
                );
            } else {
                // Older Gemini or thinking models
                budget.maxOutputTokens = Math.min(outputTokens, modelMax);
            }
            break;
        }

        case 'anthropic': {
            if (enabled) {
                // Claude with extended thinking
                const budgetTokens = DEFAULT_THINKING_BUDGETS.anthropic;
                budget.thinking = {
                    type: 'enabled',
                    budgetTokens,
                };
                budget.maxTokens = Math.min(budgetTokens + outputTokens, modelMax);
            } else {
                budget.maxTokens = Math.min(outputTokens, modelMax);
            }
            break;
        }

        case 'openai': {
            const isO1O3 = model.toLowerCase().includes('o1-') ||
                model.toLowerCase().includes('o3-');

            if (isO1O3) {
                // OpenAI o1/o3: unified token limit
                const buffer = enabled ? DEFAULT_THINKING_BUDGETS.openai : 5000;
                budget.reasoningEffort = enabled ? 'high' : 'low';
                budget.maxCompletionTokens = Math.min(
                    buffer + outputTokens,
                    modelMax
                );

                if (enabled) {
                    budget.warning = 'OpenAI o1/o3 has shared token limit. ' +
                        'Output may be shorter if model uses many reasoning tokens.';
                }
            } else {
                // GPT-4o and other non-reasoning OpenAI models
                budget.maxTokens = Math.min(outputTokens, modelMax);
            }
            break;
        }

        default:
            budget.maxOutputTokens = Math.min(outputTokens, modelMax);
    }

    return budget;
}
