/**
 * AI Service Layer
 * Centralized service for routing AI requests to appropriate vendors
 */

import { AIConnection, AIProvider, getVendor } from '@/lib/config/ai-vendors';
import { storage } from '@/core/storage/safe-storage';

export interface GenerateOptions {
    model: string;
    system?: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
}

export interface GenerateResponse {
    text: string;
    model: string;
    provider: AIProvider;
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
 */
export async function generateText(options: GenerateOptions): Promise<GenerateResponse> {
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

    switch (connection.provider) {
        case 'openrouter':
            return await generateWithOpenRouter(connection, vendorOptions);
        case 'google':
            return await generateWithGoogle(connection, vendorOptions);
        case 'mistral':
            return await generateWithMistral(connection, vendorOptions);
        case 'openai':
            return await generateWithOpenAI(connection, vendorOptions);
        case 'kimi':
            return await generateWithKimi(connection, vendorOptions);
        default:
            throw new Error(`Provider ${connection.provider} not implemented`);
    }
}

/**
 * OpenRouter API
 */
async function generateWithOpenRouter(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
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
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

    return {
        text,
        model: options.model,
        provider: 'openrouter',
    };
}

/**
 * Google AI Studio API
 */
async function generateWithGoogle(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
    const modelPath = options.model.includes('/') ? options.model : `models/${options.model}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${connection.apiKey}`;

    // Gemini content part type
    interface GeminiPart {
        text: string;
    }
    const parts: GeminiPart[] = [];
    if (options.system) {
        parts.push({ text: options.system + '\n\n' });
    }
    parts.push({ text: options.prompt });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts,
            }],
            generationConfig: {
                maxOutputTokens: options.maxTokens,
                temperature: options.temperature ?? 0.7,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google AI error: ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
        text,
        model: options.model,
        provider: 'google',
    };
}

/**
 * Mistral AI API
 */
async function generateWithMistral(
    connection: AIConnection,
    options: GenerateOptions
): Promise<GenerateResponse> {
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
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mistral API error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

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
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

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
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kimi API error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

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

    interface OpenRouterModel { id: string; }
    interface ModelListResponse { data?: OpenRouterModel[]; }
    const data = await response.json() as ModelListResponse;
    return data.data?.map((m) => m.id) || [];
}

async function fetchGoogleModels(connection: AIConnection): Promise<string[]> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${connection.apiKey}`
    );

    if (!response.ok) throw new Error('Failed to fetch Google models');

    interface GoogleModel { name: string; supportedGenerationMethods?: string[]; }
    interface GoogleModelListResponse { models?: GoogleModel[]; }
    const data = await response.json() as GoogleModelListResponse;
    return data.models
        ?.filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        ?.map((m) => m.name.replace('models/', '')) || [];
}

async function fetchMistralModels(connection: AIConnection): Promise<string[]> {
    const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
        },
    });

    if (!response.ok) throw new Error('Failed to fetch Mistral models');

    interface MistralModel { id: string; }
    interface MistralModelListResponse { data?: MistralModel[]; }
    const data = await response.json() as MistralModelListResponse;
    return data.data?.map((m) => m.id) || [];
}

async function fetchKimiModels(connection: AIConnection): Promise<string[]> {
    const response = await fetch('https://api.moonshot.cn/v1/models', {
        headers: {
            'Authorization': `Bearer ${connection.apiKey}`,
        },
    });

    if (!response.ok) throw new Error('Failed to fetch Kimi models');

    interface KimiModel { id: string; }
    interface KimiModelListResponse { data?: KimiModel[]; }
    const data = await response.json() as KimiModelListResponse;
    return data.data?.map((m) => m.id) || [];
}
