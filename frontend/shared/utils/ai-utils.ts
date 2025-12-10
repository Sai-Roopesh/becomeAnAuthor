/**
 * Shared AI Utilities
 * Extracted common functionality used across all AI features
 */

import { storage } from '@/core/storage/safe-storage';
import { STORAGE_KEYS, AI_DEFAULTS } from '@/lib/config/constants';

/**
 * Validate and retrieve AI model
 * Replaces duplicated model validation in 5+ components
 * 
 * @param preferredModel - Optional preferred model to use
 * @returns Object with model string and validation status
 */
export function getValidatedModel(
    preferredModel?: string
): { model: string; isValid: boolean } {
    // 1. Use preferred model if provided
    if (preferredModel) {
        return { model: preferredModel, isValid: true };
    }

    // 2. Try last used model from storage
    const lastUsed = storage.getItem<string>(STORAGE_KEYS.LAST_USED_MODEL, '');
    if (lastUsed) {
        return { model: lastUsed, isValid: true };
    }

    // 3. Load from AI connections
    const connections = storage.getItem<any[]>('ai_connections', []);
    const enabled = connections.filter((c: any) => c.enabled);
    const allModels = enabled.flatMap((c: any) => c.models || []);

    if (allModels.length > 0) {
        const model = allModels[0];
        storage.setItem(STORAGE_KEYS.LAST_USED_MODEL, model);
        return { model, isValid: true };
    }

    // No model available
    return { model: '', isValid: false };
}

/**
 * Format AI error messages consistently
 * Provides user-friendly error messages for common AI errors
 * 
 * @param error - The error object or message
 * @param operation - Name of the operation that failed (e.g., "Chat", "Rewrite")
 * @returns Formatted error message, or empty string if error should be suppressed
 */
export function formatAIError(error: unknown, operation: string = 'Generation'): string {
    const message = error instanceof Error ? error.message : String(error);

    // Don't show errors for user cancellations
    if (message.includes('cancel') ||
        message.includes('abort') ||
        message.includes('cancelled')) {
        return '';
    }

    // Format different error types with helpful messages
    if (message.includes('API key') || message.includes('Unauthorized')) {
        return `Invalid API key. Please check your AI connection settings.`;
    }

    if (message.includes('rate limit') || message.includes('429')) {
        return `Rate limit exceeded. Please try again in a moment.`;
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return `Request timed out. Please check your connection and try again.`;
    }

    if (message.includes('network') || message.includes('fetch failed')) {
        return `Network error. Please check your internet connection.`;
    }

    if (message.includes('model') && message.includes('not found')) {
        return `Selected model is not available. Please choose a different model.`;
    }

    if (message.includes('token') && message.includes('limit')) {
        return `Request exceeds token limit. Please reduce the input size.`;
    }

    // Default error message
    return `${operation} failed: ${message}`;
}

/**
 * Build AI prompt with context
 * Consistently formats prompts with optional context truncation
 * 
 * @param options - Prompt building options
 * @returns Object with formatted system prompt and user prompt
 */
export function buildAIPrompt(options: {
    /** System prompt/instructions for the AI */
    system?: string;
    /** Optional context to prepend to prompt */
    context?: string;
    /** The main user prompt */
    prompt: string;
    /** Maximum context length in characters */
    contextLimit?: number;
}): { system: string; prompt: string } {
    const limit = options.contextLimit || AI_DEFAULTS.CONTEXT_WINDOW_CHARS;

    // Trim context to limit (from the end, to keep most recent)
    const trimmedContext = options.context
        ? options.context.slice(-limit)
        : '';

    // Build final prompt with context if provided
    const finalPrompt = trimmedContext
        ? `Context:\n${trimmedContext}\n\n${options.prompt}`
        : options.prompt;

    return {
        system: options.system || 'You are a helpful creative writing assistant.',
        prompt: finalPrompt
    };
}

/**
 * Persist model selection to storage
 * Helper to consistently save last used model
 * 
 * @param model - Model identifier to persist
 */
export function persistModelSelection(model: string): void {
    if (model) {
        storage.setItem(STORAGE_KEYS.LAST_USED_MODEL, model);
    }
}

/**
 * Check if a model supports streaming
 * Some older models may not support streaming
 * 
 * @param model - Model identifier
 * @returns Whether the model supports streaming
 */
export function supportsStreaming(model: string): boolean {
    // Most modern models support streaming
    // Add exceptions here if needed
    const nonStreamingModels: string[] = [
        // Add any models that don't support streaming
    ];

    return !nonStreamingModels.some(m => model.includes(m));
}
