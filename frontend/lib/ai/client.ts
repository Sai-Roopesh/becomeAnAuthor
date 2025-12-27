/**
 * AI Service Layer
 * Centralized service for routing AI requests to appropriate vendors
 */

import { AIConnection, AI_VENDORS, AIProvider, getVendor } from '@/lib/config/ai-vendors';
import { getAPIKey } from '@/core/storage/api-keys';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('AIClient');
import { storage } from '@/core/storage/safe-storage';
import { fetchWithTimeout } from '@/core/api/fetch-utils';
import { withRetry } from '@/shared/utils/retry-utils';
import { parseSSEStream, parseGeminiStream } from '@/core/api/streaming-utils';
import { calculateTokenBudget, isReasoningModel, type ReasoningMode } from '@/lib/ai/token-calculator';

export interface GenerateOptions {
    model: string;
    system?: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal; // Support for request cancellation
    reasoning?: ReasoningMode; // NEW: Toggle reasoning ON/OFF
}

export interface GenerateResponse {
    text: string;
    model: string;
    provider: AIProvider;
}

// Streaming interfaces
export interface StreamCallbacks {
    onChunk: (text: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}

export interface GenerateStreamOptions extends GenerateOptions {
    onChunk: (text: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}

// API Response interfaces for type safety
interface ChatCompletionChoice {
    message?: { content?: string };
    delta?: { content?: string };
}

interface ChatCompletionResponse {
    choices?: ChatCompletionChoice[];
}

interface GeminiTextPart {
    text: string;
}

interface OpenRouterModel {
    id: string;
}

interface GoogleModel {
    name: string;
    supportedGenerationMethods?: string[];
}

interface MistralModel {
    id: string;
}

interface KimiModel {
    id: string;
}

/**
 * Get all enabled AI connections from localStorage
 * ✅ SAFE: Uses safe-storage wrapper to prevent crashes
 */
export function getEnabledConnections(): AIConnection[] {
    const connections = storage.getItem<AIConnection[]>('ai_connections', []);
    return connections.filter(c => c.enabled);
}

/**
 * Find connection that supports a specific model
 * Prioritizes native provider connections over OpenRouter
 */
export function getConnectionForModel(model: string): AIConnection | null {
    const connections = getEnabledConnections();

    // Extract provider and base model name from model ID
    // e.g., "google/gemini-2.5-pro" -> provider: "google", baseName: "gemini-2.5-pro"
    const parts = model.split('/');
    const hasPrefix = parts.length > 1;
    const providerPrefix = hasPrefix ? parts[0] : null;
    const baseModelName = hasPrefix ? parts.slice(1).join('/') : model;

    // First, try to find a native provider connection that matches
    if (providerPrefix) {
        let nativeProvider: AIProvider | null = null;

        // Map OpenRouter prefixes to native providers
        if (providerPrefix === 'google' || providerPrefix.includes('gemini')) {
            nativeProvider = 'google';
        } else if (providerPrefix === 'mistral') {
            nativeProvider = 'mistral';
        } else if (providerPrefix === 'openai') {
            nativeProvider = 'openai';
        }

        // Look for native provider connection with the base model name
        if (nativeProvider) {
            const nativeConnection = connections.find(c =>
                c.provider === nativeProvider &&
                c.models?.some(m =>
                    m === baseModelName ||
                    m === model ||
                    `${providerPrefix}/${m}` === model
                )
            );

            if (nativeConnection) {
                return nativeConnection;
            }
        }
    }

    // Fall back to exact match (for OpenRouter or other connections)
    for (const connection of connections) {
        if (connection.models && connection.models.includes(model)) {
            return connection;
        }
    }

    return null;
}

/**
 * Generate text using the appropriate AI vendor
 * Includes retry logic for transient failures
 */
export async function generateText(options: GenerateOptions): Promise<GenerateResponse> {
    // Check if request was aborted before starting
    if (options.signal?.aborted) {
        throw new Error('Request was cancelled');
    }

    return withRetry(async () => {
        try {
            const connection = getConnectionForModel(options.model);

            if (!connection) {
                throw new Error(`No enabled connection found for model: ${options.model}`);
            }

            const vendor = getVendor(connection.provider);
            if (!vendor) {
                throw new Error(`Unknown provider: ${connection.provider}`);
            }

            // Prepare the correct model name format for the vendor
            let modelToUse = options.model;

            // For native providers (not OpenRouter), strip the provider prefix if present
            if (connection.provider !== 'openrouter') {
                const parts = options.model.split('/');
                if (parts.length > 1) {
                    // Use the base model name without prefix
                    modelToUse = parts.slice(1).join('/');
                }
            }

            const vendorOptions = {
                ...options,
                model: modelToUse,
            };

            let result: GenerateResponse;

            switch (connection.provider) {
                case 'openrouter':
                    result = await generateWithOpenRouter(connection, vendorOptions);
                    break;
                case 'google':
                    result = await generateWithGoogle(connection, vendorOptions);
                    break;
                case 'mistral':
                    result = await generateWithMistral(connection, vendorOptions);
                    break;
                case 'openai':
                    result = await generateWithOpenAI(connection, vendorOptions);
                    break;
                case 'kimi':
                    result = await generateWithKimi(connection, vendorOptions);
                    break;
                default:
                    throw new Error(`Provider ${connection.provider} not implemented`);
            }

            return result;
        } catch (error) {
            // ✅ Ensure errors are properly logged and re-thrown
            console.error('[AI Client] Generation error:', error);
            throw error; // Re-throw to propagate to UI layer
        }
    }, {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error: Error) => {
            // Don't retry if request was cancelled
            if (options.signal?.aborted || error.message.includes('cancelled')) {
                return false;
            }
            // Use default retry logic for other errors
            return true;
        }
    });
}

/**
 * Generate text with streaming support
 * Calls onChunk for each piece of text as it arrives
 */
export async function generateTextStream(options: GenerateStreamOptions): Promise<void> {
    // Check if request was aborted before starting
    if (options.signal?.aborted) {
        throw new Error('Request was cancelled');
    }

    const connection = getConnectionForModel(options.model);

    if (!connection) {
        const error = new Error(`No enabled connection found for model: ${options.model}`);
        options.onError?.(error);
        throw error;
    }

    const vendor = getVendor(connection.provider);
    if (!vendor) {
        const error = new Error(`Unknown provider: ${connection.provider}`);
        options.onError?.(error);
        throw error;
    }

    // Prepare the correct model name format for the vendor
    let modelToUse = options.model;

    // For native providers (not OpenRouter), strip the provider prefix if present
    if (connection.provider !== 'openrouter') {
        const parts = options.model.split('/');
        if (parts.length > 1) {
            modelToUse = parts.slice(1).join('/');
        }
    }

    const streamOptions = {
        ...options,
        model: modelToUse,
    };

    try {
        switch (connection.provider) {
            case 'openrouter':
                await streamWithOpenRouter(connection, streamOptions);
                break;
            case 'google':
                await streamWithGoogle(connection, streamOptions);
                break;
            case 'mistral':
                await streamWithMistral(connection, streamOptions);
                break;
            case 'openai':
                await streamWithOpenAI(connection, streamOptions);
                break;
            case 'kimi':
                await streamWithKimi(connection, streamOptions);
                break;
            default:
                throw new Error(`Streaming not implemented for provider ${connection.provider}`);
        }
    } catch (error) {
        console.error('[AI Client] Streaming error:', error);
        options.onError?.(error as Error);
        throw error;
    }
}

// ✅ VALIDATION HELPERS: Ensure API responses have expected structure
function validateOpenRouterResponse(data: ChatCompletionResponse): string {
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('OpenRouter returned invalid response: missing choices array');
    }
    const content = data.choices[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error('OpenRouter returned invalid response: missing content');
    }
    return content;
}

function validateMistralResponse(data: ChatCompletionResponse): string {
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('Mistral returned invalid response: missing choices array');
    }
    const content = data.choices[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error('Mistral returned invalid response: missing content');
    }
    return content;
}

function validateOpenAIResponse(data: ChatCompletionResponse): string {
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('OpenAI returned invalid response: missing choices array');
    }
    const content = data.choices[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error('OpenAI returned invalid response: missing content');
    }
    return content;
}

function validateKimiResponse(data: ChatCompletionResponse): string {
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('Kimi returned invalid response: missing choices array');
    }
    const content = data.choices[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error('Kimi returned invalid response: missing content');
    }
    return content;
}

/**
 * OpenRouter API
 */
async function generateWithOpenRouter(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
    try {
        const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Become an Author',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options.model,
                messages: [
                    ...(options.system ? [{ role: 'system', content: options.system }] : []),
                    { role: 'user', content: options.prompt },
                ],
                max_tokens: options.maxTokens,
                temperature: options.temperature ?? 0.7,
            }),
            ...(options.signal && { signal: options.signal }), // Pass abort signal
        }, 60000); // 60 second timeout for AI generation

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API error details:', errorText);

            // Parse error response for better user messages
            try {
                const errorData = JSON.parse(errorText);
                const errorMessage = errorData.error?.message || errorData.message || '';

                // Provide specific error messages for common issues
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your OpenRouter API key in settings.');
                }
                if (response.status === 429 || errorMessage.toLowerCase().includes('rate limit')) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                }
                if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('insufficient')) {
                    throw new Error('API quota exceeded. Please check your account credits or try a different model.');
                }
                if (errorMessage.toLowerCase().includes('model') && errorMessage.toLowerCase().includes('not found')) {
                    throw new Error('Model not found or not available. Please try a different model.');
                }

                // If we have a specific error message, use it
                if (errorMessage) {
                    throw new Error(`OpenRouter error: ${errorMessage}`);
                }
            } catch (parseError) {
                // If JSON parsing fails, use status-based message
                if (parseError instanceof Error && parseError.message.startsWith('OpenRouter')) {
                    throw parseError; // Re-throw our custom errors
                }
            }

            throw new Error(`OpenRouter API error (${response.status})`);
        }

        const data = await response.json();
        const text = validateOpenRouterResponse(data); // ✅ Validated

        return {
            text,
            model: options.model,
            provider: 'openrouter',
        };
    } catch (error) {
        // ✅ Enhanced error handling for network failures
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                throw new Error('Request timed out. Please check your internet connection and try again.');
            }
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Network error. Please check your internet connection.');
            }
        }
        throw error;
    }
}

/**
 * Google AI Studio API
 * Updated to support reasoning toggle via thinkingConfig
 */
async function generateWithGoogle(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
    try {
        const modelPath = options.model.includes('/') ? options.model : `models/${options.model}`;
        // ✅ SECURITY FIX: API key in header instead of URL to prevent exposure in logs/history
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent`;

        const parts: GeminiTextPart[] = [];
        if (options.system) {
            parts.push({ text: options.system + '\n\n' });
        }
        parts.push({ text: options.prompt });

        // Calculate token budget with reasoning toggle support
        const reasoningMode = options.reasoning ?? 'enabled'; // Default to enabled for quality
        const words = Math.ceil((options.maxTokens ?? 1000) / 1.3);
        const tokenBudget = calculateTokenBudget({
            model: options.model,
            words,
            reasoning: reasoningMode,
        });

        // Build generationConfig with thinking support
        const generationConfig: Record<string, unknown> = {
            maxOutputTokens: tokenBudget.maxOutputTokens ?? options.maxTokens,
            temperature: options.temperature ?? 0.7,
        };

        // Add thinkingConfig for Gemini 2.5/3 models
        if (isReasoningModel(options.model)) {
            const thinkingConfig: Record<string, unknown> = {};

            if (tokenBudget.thinkingLevel) {
                // Gemini 3: use thinkingLevel
                thinkingConfig['thinkingLevel'] = tokenBudget.thinkingLevel;
            } else if (tokenBudget.thinkingBudget !== undefined) {
                // Gemini 2.5: use thinkingBudget
                thinkingConfig['thinkingBudget'] = tokenBudget.thinkingBudget;
            }

            if (Object.keys(thinkingConfig).length > 0) {
                generationConfig['thinkingConfig'] = thinkingConfig;
            }
        }

        log.debug('Google AI request config', {
            model: options.model,
            reasoning: reasoningMode,
            maxOutputTokens: generationConfig['maxOutputTokens'],
            thinkingConfig: generationConfig['thinkingConfig'],
        });

        const response = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': connection.apiKey, // ✅ API key in header
            },
            body: JSON.stringify({
                contents: [{
                    parts,
                }],
                generationConfig,
            }),
            ...(options.signal && { signal: options.signal }), // Pass abort signal
        }, 60000);

        if (!response.ok) {
            const error = await response.text();
            console.error('Google AI error details:', error); // ✅ Log full error
            throw new Error(`Google AI error (${response.status})`); // ✅ Generic user message
        }

        const data = await response.json();

        // ✅ VALIDATION: Ensure response has expected structure
        if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
            throw new Error('Google AI returned invalid response format');
        }

        const text = data.candidates[0]?.content?.parts?.[0]?.text;
        if (typeof text !== 'string') {
            throw new Error('Google AI response missing text content');
        }

        return {
            text,
            model: options.model,
            provider: 'google',
        };
    } catch (error) {
        // ✅ Enhanced error handling for network failures
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                throw new Error('Request timed out. Please check your internet connection and try again.');
            }
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Network error. Please check your internet connection.');
            }
        }
        throw error;
    }
}

/**
 * Mistral AI API
 */
async function generateWithMistral(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
    const response = await fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: options.model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
        }),
        ...(options.signal && { signal: options.signal }), // Pass abort signal
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mistral API error: ${error}`);
    }

    const data = await response.json();
    const text = validateMistralResponse(data); // ✅ Validated

    return {
        text,
        model: options.model,
        provider: 'mistral',
    };
}

/**
 * OpenAI Compatible API
 */
async function generateWithOpenAI(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
    const endpoint = connection.customEndpoint || 'https://api.openai.com/v1';

    const response = await fetchWithTimeout(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
            ...(connection.apiKey ? { 'Authorization': `Bearer ${connection.apiKey}` } : {}),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: options.model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
        }),
        ...(options.signal && { signal: options.signal }), // Pass abort signal
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const text = validateOpenAIResponse(data); // ✅ Validated

    return {
        text,
        model: options.model,
        provider: 'openai',
    };
}

/**
 * Kimi-LLM API
 */
async function generateWithKimi(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
    const response = await fetchWithTimeout('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: options.model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
        }),
        ...(options.signal && { signal: options.signal }), // Pass abort signal
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kimi API error: ${error}`);
    }

    const data = await response.json();
    const text = validateKimiResponse(data); // ✅ Validated

    return {
        text,
        model: options.model,
        provider: 'kimi',
    };
}

/**
 * Fetch models for a connection
 */
export async function fetchModelsForConnection(connection: AIConnection): Promise<string[]> {
    const vendor = getVendor(connection.provider);
    if (!vendor) return [];

    // If vendor has default models and no models endpoint, return defaults
    if (vendor.defaultModels && !vendor.modelsEndpoint) {
        return vendor.defaultModels;
    }

    if (!vendor.modelsEndpoint) return [];

    try {
        switch (connection.provider) {
            case 'openrouter':
                return await fetchOpenRouterModels(connection);
            case 'google':
                return await fetchGoogleModels(connection);
            case 'mistral':
                return await fetchMistralModels(connection);
            case 'kimi':
                return await fetchKimiModels(connection);
            case 'openai':
                return vendor.defaultModels || [];
            default:
                return vendor.defaultModels || [];
        }
    } catch (error) {
        console.error(`Failed to fetch models for ${connection.provider}:`, error);
        return vendor.defaultModels || [];
    }
}

async function fetchOpenRouterModels(connection: AIConnection): Promise<string[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
        },
    });

    if (!response.ok) throw new Error('Failed to fetch OpenRouter models');

    const data = await response.json();
    return data.data?.map((m: OpenRouterModel) => m.id) || [];
}

async function fetchGoogleModels(connection: AIConnection): Promise<string[]> {
    const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models',
        {
            headers: {
                'x-goog-api-key': connection.apiKey, // ✅ API key in header
            },
        }
    );

    if (!response.ok) {
        console.error('Failed to fetch Google models:', response.status);
        throw new Error(`Failed to fetch Google models (${response.status})`);
    }

    const data = await response.json();
    return data.models
        ?.filter((m: GoogleModel) => m.supportedGenerationMethods?.includes('generateContent'))
        ?.map((m: GoogleModel) => m.name.replace('models/', '')) || [];
}

async function fetchMistralModels(connection: AIConnection): Promise<string[]> {
    const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
        },
    });

    if (!response.ok) throw new Error('Failed to fetch Mistral models');

    const data = await response.json();
    return data.data?.map((m: MistralModel) => m.id) || [];
}

async function fetchKimiModels(connection: AIConnection): Promise<string[]> {
    const response = await fetch('https://api.moonshot.cn/v1/models', {
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
        },
    });

    if (!response.ok) throw new Error('Failed to fetch Kimi models');

    const data = await response.json();
    return data.data?.map((m: KimiModel) => m.id) || [];
}

// ===== STREAMING PROVIDER IMPLEMENTATIONS =====

/**
 * Stream with OpenRouter
 */
async function streamWithOpenRouter(connection: AIConnection, options: GenerateStreamOptions): Promise<void> {
    let fullText = '';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Become an Author',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: options.model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
            stream: true, // Enable streaming
        }),
        ...(options.signal && { signal: options.signal }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter error: ${error}`);
    }

    await parseSSEStream(
        response,
        (chunk: string) => {
            fullText += chunk;
            options.onChunk(chunk);
        },
        () => {
            options.onComplete?.(fullText);
        },
        options.signal
    );
}

/**
 * Stream with OpenAI (or compatible)
 */
async function streamWithOpenAI(connection: AIConnection, options: GenerateStreamOptions): Promise<void> {
    let fullText = '';
    const endpoint = connection.customEndpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
            ...(connection.apiKey ? { 'Authorization': `Bearer ${connection.apiKey}` } : {}),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: options.model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
            stream: true,
        }),
        ...(options.signal && { signal: options.signal }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI error: ${error}`);
    }

    await parseSSEStream(
        response,
        (chunk: string) => {
            fullText += chunk;
            options.onChunk(chunk);
        },
        () => {
            options.onComplete?.(fullText);
        },
        options.signal
    );
}

/**
 * Stream with Mistral
 */
async function streamWithMistral(connection: AIConnection, options: GenerateStreamOptions): Promise<void> {
    let fullText = '';

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: options.model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
            stream: true,
        }),
        ...(options.signal && { signal: options.signal }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mistral error: ${error}`);
    }

    await parseSSEStream(
        response,
        (chunk: string) => {
            fullText += chunk;
            options.onChunk(chunk);
        },
        () => {
            options.onComplete?.(fullText);
        },
        options.signal
    );
}

/**
 * Stream with Google Gemini
 */
async function streamWithGoogle(connection: AIConnection, options: GenerateStreamOptions): Promise<void> {
    let fullText = '';
    const baseModel = options.model.includes('/') ? options.model.split('/').pop() : options.model;
    // CRITICAL: Gemini streaming requires ?alt=sse query parameter!
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${baseModel}:streamGenerateContent?alt=sse`;

    const parts: GeminiTextPart[] = [];
    if (options.system) {
        parts.push({ text: `${options.system}\n\n` });
    }
    parts.push({ text: options.prompt });

    // Calculate token budget with reasoning toggle support
    const reasoningMode = options.reasoning ?? 'enabled'; // Default to enabled for quality
    const words = Math.ceil((options.maxTokens ?? 1000) / 1.3);
    const tokenBudget = calculateTokenBudget({
        model: options.model,
        words,
        reasoning: reasoningMode,
    });

    // Build generationConfig with thinking support
    const generationConfig: Record<string, unknown> = {
        maxOutputTokens: tokenBudget.maxOutputTokens ?? options.maxTokens,
        temperature: options.temperature ?? 0.7,
    };

    // Add thinkingConfig for Gemini 2.5/3 models
    if (isReasoningModel(options.model)) {
        const thinkingConfig: Record<string, unknown> = {};

        if (tokenBudget.thinkingLevel) {
            // Gemini 3: use thinkingLevel
            thinkingConfig['thinkingLevel'] = tokenBudget.thinkingLevel;
        } else if (tokenBudget.thinkingBudget !== undefined) {
            // Gemini 2.5: use thinkingBudget
            thinkingConfig['thinkingBudget'] = tokenBudget.thinkingBudget;
        }

        if (Object.keys(thinkingConfig).length > 0) {
            generationConfig['thinkingConfig'] = thinkingConfig;
        }
    }

    log.debug('Calling Google AI streaming endpoint', {
        endpoint,
        reasoning: reasoningMode,
        maxOutputTokens: generationConfig['maxOutputTokens'],
    });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': connection.apiKey,
        },
        body: JSON.stringify({
            contents: [{
                parts,
            }],
            generationConfig,
        }),
        ...(options.signal && { signal: options.signal }),
    });

    log.debug('Response status', { status: response.status, statusText: response.statusText });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google error: ${error}`);
    }

    // Gemini with alt=sse returns SSE format, not custom JSON
    await parseSSEStream(
        response,
        (chunk: string) => {
            log.debug('Received chunk');
            fullText += chunk;
            options.onChunk(chunk);
        },
        () => {
            log.debug('Stream complete', { totalLength: fullText.length });
            options.onComplete?.(fullText);
        },
        options.signal
    );
}

/**
 * Stream with Kimi
 */
async function streamWithKimi(connection: AIConnection, options: GenerateStreamOptions): Promise<void> {
    let fullText = '';

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: options.model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
            stream: true,
        }),
        ...(options.signal && { signal: options.signal }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kimi error: ${error}`);
    }

    await parseSSEStream(
        response,
        (chunk: string) => {
            fullText += chunk;
            options.onChunk(chunk);
        },
        () => {
            options.onComplete?.(fullText);
        },
        options.signal
    );
}
