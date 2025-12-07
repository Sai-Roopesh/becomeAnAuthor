/**
 * Model Specifications
 * Defines token limits and capabilities for each AI model
 */

export interface ModelSpec {
    /** Maximum input tokens (context) */
    maxInputTokens: number;
    /** Maximum output tokens (generation) */
    maxOutputTokens: number;
    /** Tokens reserved for thinking (e.g., Gemini 2.5) */
    thinkingTokenBudget: number;
    /** Recommended output tokens for general use */
    recommendedOutput: number;
    /** Supports streaming */
    supportsStreaming: boolean;
}

/**
 * Model specifications registry
 * Used to determine appropriate token limits
 */
export const MODEL_SPECS: Record<string, ModelSpec> = {
    // Google Gemini Models
    'google/gemini-2.5-flash': {
        maxInputTokens: 1000000,
        maxOutputTokens: 8192,
        thinkingTokenBudget: 2000, // Reserve for thinking tokens
        recommendedOutput: 6000, // Safe default after thinking budget
        supportsStreaming: true,
    },
    'google/gemini-2.0-flash-exp': {
        maxInputTokens: 1000000,
        maxOutputTokens: 8192,
        thinkingTokenBudget: 2000,
        recommendedOutput: 6000,
        supportsStreaming: true,
    },
    'google/gemini-1.5-pro': {
        maxInputTokens: 2000000,
        maxOutputTokens: 8192,
        thinkingTokenBudget: 0,
        recommendedOutput: 4096,
        supportsStreaming: true,
    },
    'google/gemini-1.5-flash': {
        maxInputTokens: 1000000,
        maxOutputTokens: 8192,
        thinkingTokenBudget: 0,
        recommendedOutput: 4096,
        supportsStreaming: true,
    },

    // OpenAI Models
    'openai/gpt-4': {
        maxInputTokens: 8192,
        maxOutputTokens: 4096,
        thinkingTokenBudget: 0,
        recommendedOutput: 2000,
        supportsStreaming: true,
    },
    'openai/gpt-4-turbo': {
        maxInputTokens: 128000,
        maxOutputTokens: 4096,
        thinkingTokenBudget: 0,
        recommendedOutput: 3000,
        supportsStreaming: true,
    },
    'openai/gpt-3.5-turbo': {
        maxInputTokens: 16385,
        maxOutputTokens: 4096,
        thinkingTokenBudget: 0,
        recommendedOutput: 2000,
        supportsStreaming: true,
    },
    'openai/gpt-4o': {
        maxInputTokens: 128000,
        maxOutputTokens: 16384,
        thinkingTokenBudget: 0,
        recommendedOutput: 4096,
        supportsStreaming: true,
    },

    // Anthropic Claude
    'anthropic/claude-3-opus': {
        maxInputTokens: 200000,
        maxOutputTokens: 4096,
        thinkingTokenBudget: 0,
        recommendedOutput: 3000,
        supportsStreaming: true,
    },
    'anthropic/claude-3-sonnet': {
        maxInputTokens: 200000,
        maxOutputTokens: 4096,
        thinkingTokenBudget: 0,
        recommendedOutput: 3000,
        supportsStreaming: true,
    },
    'anthropic/claude-3-haiku': {
        maxInputTokens: 200000,
        maxOutputTokens: 4096,
        thinkingTokenBudget: 0,
        recommendedOutput: 2000,
        supportsStreaming: true,
    },

    // Mistral
    'mistral/mistral-large': {
        maxInputTokens: 32000,
        maxOutputTokens: 8192,
        thinkingTokenBudget: 0,
        recommendedOutput: 4096,
        supportsStreaming: true,
    },
    'mistral/mistral-medium': {
        maxInputTokens: 32000,
        maxOutputTokens: 8192,
        thinkingTokenBudget: 0,
        recommendedOutput: 4096,
        supportsStreaming: true,
    },
};

/**
 * Get model spec, with fallback to conservative defaults
 */
export function getModelSpec(model: string): ModelSpec {
    // Try exact match
    if (MODEL_SPECS[model]) {
        return MODEL_SPECS[model];
    }

    // Try without provider prefix
    const parts = model.split('/');
    if (parts.length > 1) {
        const baseModel = parts.slice(1).join('/');
        for (const [key, spec] of Object.entries(MODEL_SPECS)) {
            if (key.endsWith(baseModel)) {
                return spec;
            }
        }
    }

    // Conservative defaults for unknown models
    return {
        maxInputTokens: 8192,
        maxOutputTokens: 4096,
        thinkingTokenBudget: 0,
        recommendedOutput: 2000,
        supportsStreaming: true,
    };
}

/**
 * Calculate output tokens based on word count
 * Rule of thumb: 1 word ≈ 1.3 tokens (English average)
 */
export function wordsToTokens(words: number): number {
    return Math.ceil(words * 1.3);
}

/**
 * Calculate max tokens for a model based on user's word count
 * @param model Model identifier
 * @param userWordCount User-selected word count from UI (200/400/600 buttons)
 * @returns Appropriate maxTokens value
 */
export function calculateMaxTokens(model: string, userWordCount: number): number {
    const spec = getModelSpec(model);

    // Convert user's word count to tokens
    const requestedTokens = wordsToTokens(userWordCount);

    // Calculate max allowed after reserving space for thinking tokens
    const maxAllowed = spec.maxOutputTokens - spec.thinkingTokenBudget;

    // Return requested or max allowed, whichever is smaller
    return Math.min(requestedTokens, maxAllowed);
}
