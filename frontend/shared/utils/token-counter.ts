/**
 * Token Counter Service
 * Provides accurate token counting using tiktoken
 */

// Lazy import to avoid Next.js SSR issues with WASM
// Note: Using unknown because tiktoken types are loaded dynamically
type Encoding = { encode: (text: string) => number[]; free: () => void };
let encoding_for_model: ((model: string) => Encoding) | null = null;

// Cache encoders to avoid re-initialization overhead
const encoderCache = new Map<string, Encoding>();

/**
 * Lazy load tiktoken (client-side only)
 */
async function loadTiktoken() {
    if (encoding_for_model) return encoding_for_model;

    try {
        const tiktoken = await import('@dqbd/tiktoken');
        // Cast to unknown first, then to our Encoding type - tiktoken's types are complex
        encoding_for_model = tiktoken.encoding_for_model as unknown as (model: string) => Encoding;
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

    // Sync estimation for UI responsiveness - use countTokensAsync for accuracy
    return Math.ceil(text.length / 4);
}

/**
 * Async token counting with true accuracy using tiktoken WASM
 * Use this when accuracy matters more than immediate response
 */
export async function countTokensAsync(text: string, model: string): Promise<number> {
    // Only use tiktoken on client-side
    if (typeof window === 'undefined') {
        return Math.ceil(text.length / 4);
    }

    try {
        const getEncoding = await loadTiktoken();
        if (!getEncoding) {
            return Math.ceil(text.length / 4);
        }

        const normalizedModel = normalizeModelName(model);

        // Check cache
        if (!encoderCache.has(normalizedModel)) {
            try {
                const enc = getEncoding(normalizedModel);
                encoderCache.set(normalizedModel, enc);
            } catch {
                // Model not supported, use gpt-4 as fallback
                if (!encoderCache.has('gpt-4')) {
                    encoderCache.set('gpt-4', getEncoding('gpt-4'));
                }
                return encoderCache.get('gpt-4')!.encode(text).length;
            }
        }

        return encoderCache.get(normalizedModel)!.encode(text).length;
    } catch (error) {
        console.warn('tiktoken failed, using estimation:', error);
        return Math.ceil(text.length / 4);
    }
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
 * Includes overhead for message formatting (sync version)
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

/**
 * Async version of countMessagesTokens for accurate counting
 */
export async function countMessagesTokensAsync(
    messages: Array<{ role: string; content: string }>,
    model: string
): Promise<number> {
    let tokens = 0;

    // Count tokens for each message + formatting overhead
    for (const message of messages) {
        tokens += await countTokensAsync(message.content, model);
        tokens += 4; // Overhead per message (role, formatting, etc.)
    }

    tokens += 2; // Overhead for message array

    return tokens;
}

