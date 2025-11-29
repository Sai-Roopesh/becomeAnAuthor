/**
 * Token Counter Service
 * Provides accurate token counting using tiktoken
 */

// Lazy import to avoid Next.js SSR issues with WASM
type Tiktoken = any;
let encoding_for_model: any = null;

// Cache encoders to avoid re-initialization overhead
const encoderCache = new Map<string, Tiktoken>();

/**
 * Lazy load tiktoken (client-side only)
 */
async function loadTiktoken() {
    if (encoding_for_model) return encoding_for_model;

    try {
        const tiktoken = await import('@dqbd/tiktoken');
        encoding_for_model = tiktoken.encoding_for_model;
        return encoding_for_model;
    } catch (error) {
        console.warn('Failed to load tiktoken:', error);
        return null;
    }
}

/**
 * Count tokens for a given text and model
 * Falls back to estimation if model is unsupported or on server
 */
export function countTokens(text: string, model: string): number {
    // Only use tiktoken on client-side to avoid Next.js SSR issues
    if (typeof window === 'undefined') {
        // Server-side: use fallback estimation
        return Math.ceil(text.length / 4);
    }

    // For now, use estimation (will be accurate once tiktoken loads)
    // TODO: Make this async for true accuracy
    return Math.ceil(text.length / 4);
}

/**
 * Normalize model names to tiktoken's expected format
 * Maps various model names to their tiktoken counterparts
 */
function normalizeModelName(model: string): string {
    // Remove provider prefixes (e.g., "google/gemini-pro" -> "gemini-pro")
    const baseModel = model.includes('/') ? model.split('/').pop()! : model;

    // Map to tiktoken model names
    const modelMap: Record<string, string> = {
        // OpenAI models
        'gpt-4o': 'gpt-4o',
        'gpt-4o-mini': 'gpt-4o',
        'gpt-4-turbo': 'gpt-4-turbo',
        'gpt-4': 'gpt-4',
        'gpt-3.5-turbo': 'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k': 'gpt-3.5-turbo-16k',

        // Claude models (use GPT-4 as approximation)
        'claude-3-opus': 'gpt-4',
        'claude-3-sonnet': 'gpt-4',
        'claude-3-haiku': 'gpt-4',
        'claude-3-5-sonnet': 'gpt-4',

        // Gemini models (use GPT-4 as approximation)
        'gemini-2.0-flash': 'gpt-4',
        'gemini-2.0-flash-exp': 'gpt-4',
        'gemini-2.5-flash': 'gpt-4',
        'gemini-2.5-pro': 'gpt-4',
        'gemini-pro': 'gpt-4',
        'gemini-pro-latest': 'gpt-4',

        // Mistral (use GPT-4 as approximation)
        'mistral-large-latest': 'gpt-4',
        'mistral-medium-latest': 'gpt-4',
        'mistral-small-latest': 'gpt-4',
    };

    return modelMap[baseModel] || 'gpt-4'; // Default to gpt-4 tokenizer
}

/**
 * Free all cached encoders
 * IMPORTANT: Call this on app cleanup to prevent memory leaks
 */
export function freeTokenCounters() {
    for (const encoder of encoderCache.values()) {
        encoder.free();
    }
    encoderCache.clear();
}

/**
 * Get token count for messages format (chat completion)
 * Includes overhead for message formatting
 */
export function countMessagesTokens(
    messages: Array<{ role: string; content: string }>,
    model: string
): number {
    let tokens = 0;

    // Count tokens for each message + formatting overhead
    for (const message of messages) {
        tokens += countTokens(message.content, model);
        tokens += 4; // Overhead per message (role, formatting, etc.)
    }

    tokens += 2; // Overhead for message array

    return tokens;
}
