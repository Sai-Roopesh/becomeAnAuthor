/**
 * AI Module - Unified exports
 * 
 * This module provides all AI-related functionality including:
 * - Token calculation with reasoning toggle support
 * - Multi-vendor text generation (Google, OpenAI, Anthropic, Mistral, Kimi)
 * - Streaming support
 * - Model fetching
 */

// Token calculator exports
export {
    wordsToTokens,
    isReasoningModel,
    calculateTokenBudget,
    type ReasoningMode,
    type TokenBudget,
    type TokenBudgetInput,
} from './token-calculator';

// AI client exports
export {
    generateText,
    generateTextStream,
    getEnabledConnections,
    getConnectionForModel,
    fetchModelsForConnection,
    type GenerateOptions,
    type GenerateStreamOptions,
    type GenerateResponse,
    type StreamCallbacks,
} from './client';
