/**
 * Model Discovery Service Implementation
 *
 * Fetches available AI models from provider APIs.
 * Each provider has its own endpoint and response format.
 *
 * @see CODING_GUIDELINES.md - 8-Layer Architecture, Layer 5 (Infrastructure)
 * @see IModelDiscoveryService for interface definition
 */

import type {
    IModelDiscoveryService,
    AIModel,
    ModelDiscoveryResult,
} from '@/domain/services/IModelDiscoveryService';
import { logger } from '@/shared/utils/logger';
import { storage } from '@/core/storage/safe-storage';

const log = logger.scope('ModelDiscoveryService');

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

// Provider API endpoints
const PROVIDER_ENDPOINTS: Record<string, string> = {
    openai: 'https://api.openai.com/v1/models',
    anthropic: 'https://api.anthropic.com/v1/models',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    openrouter: 'https://openrouter.ai/api/v1/models',
    groq: 'https://api.groq.com/openai/v1/models',
    mistral: 'https://api.mistral.ai/v1/models',
    deepseek: 'https://api.deepseek.com/v1/models',
    cohere: 'https://api.cohere.ai/v1/models',
    xai: 'https://api.x.ai/v1/models',
    togetherai: 'https://api.together.xyz/v1/models',
    fireworks: 'https://api.fireworks.ai/inference/v1/models',
    perplexity: 'https://api.perplexity.ai/models',
};

// Providers that support model listing
const SUPPORTED_PROVIDERS = new Set(Object.keys(PROVIDER_ENDPOINTS));

/**
 * Parse OpenAI-compatible model list response
 */
function parseOpenAIResponse(
    data: { data: Array<{ id: string; owned_by?: string }> },
    provider: string
): AIModel[] {
    return data.data
        .filter((m) => {
            // Filter out embedding, whisper, and deprecated models
            const id = m.id.toLowerCase();
            return (
                !id.includes('embedding') &&
                !id.includes('whisper') &&
                !id.includes('tts') &&
                !id.includes('dall-e') &&
                !id.includes('moderation')
            );
        })
        .map((m) => ({
            id: m.id,
            name: m.id,
            provider,
        }))
        .sort((a, b) => {
            // Sort by model name, preferring newer versions
            const aNum = extractVersion(a.id);
            const bNum = extractVersion(b.id);
            return bNum - aNum;
        });
}

/**
 * Parse Anthropic model list response
 */
function parseAnthropicResponse(
    data: { data: Array<{ id: string; display_name?: string; type: string }> },
    provider: string
): AIModel[] {
    return data.data
        .filter((m) => m.type === 'model')
        .map((m) => ({
            id: m.id,
            name: m.display_name || m.id,
            provider,
        }))
        .sort((a, b) => {
            // Prefer opus > sonnet > haiku, and higher versions
            const order = ['opus', 'sonnet', 'haiku'];
            const aType = order.findIndex((t) => a.id.includes(t));
            const bType = order.findIndex((t) => b.id.includes(t));
            if (aType !== bType) return aType - bType;
            return extractVersion(b.id) - extractVersion(a.id);
        });
}

/**
 * Parse Google Gemini model list response
 */
function parseGoogleResponse(
    data: { models: Array<{ name: string; displayName: string; inputTokenLimit?: number; outputTokenLimit?: number }> },
    provider: string
): AIModel[] {
    return data.models
        .filter((m) => {
            // Include only generative models
            const name = m.name.toLowerCase();
            return (
                name.includes('gemini') &&
                !name.includes('embedding') &&
                !name.includes('vision')
            );
        })
        .map((m) => {
            const model: AIModel = {
                id: m.name.replace('models/', ''),
                name: m.displayName || m.name.replace('models/', ''),
                provider,
            };
            // Only add optional fields if defined
            if (m.inputTokenLimit !== undefined) {
                model.contextWindow = m.inputTokenLimit;
            }
            if (m.outputTokenLimit !== undefined) {
                model.maxOutputTokens = m.outputTokenLimit;
            }
            return model;
        })
        .sort((a, b) => extractVersion(b.id) - extractVersion(a.id));
}

/**
 * Parse OpenRouter model list response
 */
function parseOpenRouterResponse(
    data: { data: Array<{ id: string; name: string; context_length?: number }> },
    provider: string
): AIModel[] {
    return data.data
        .filter((m) => {
            // Include only chat models, exclude image/audio
            const id = m.id.toLowerCase();
            return !id.includes('vision') && !id.includes('image') && !id.includes('audio');
        })
        .map((m) => {
            const model: AIModel = {
                id: m.id,
                name: m.name || m.id,
                provider,
            };
            if (m.context_length !== undefined) {
                model.contextWindow = m.context_length;
            }
            return model;
        })
        .slice(0, 100); // Limit to top 100 to avoid UI overload
}

/**
 * Extract version number from model ID for sorting
 */
function extractVersion(modelId: string): number {
    const match = modelId.match(/(\d+\.?\d*)/);
    return match && match[1] ? parseFloat(match[1]) : 0;
}

/**
 * ModelDiscoveryService - Fetches available models from AI providers
 */
export class ModelDiscoveryService implements IModelDiscoveryService {
    private static instance: ModelDiscoveryService;

    private constructor() { }

    static getInstance(): ModelDiscoveryService {
        if (!ModelDiscoveryService.instance) {
            ModelDiscoveryService.instance = new ModelDiscoveryService();
        }
        return ModelDiscoveryService.instance;
    }

    supportsModelListing(provider: string): boolean {
        return SUPPORTED_PROVIDERS.has(provider);
    }

    getCachedModels(provider: string): ModelDiscoveryResult | null {
        const cacheKey = `model_cache_${provider}`;
        const cached = storage.getItem<ModelDiscoveryResult | null>(cacheKey, null);

        if (!cached || !cached.cachedAt) return null;

        // Check if cache is expired
        if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
            storage.removeItem(cacheKey);
            return null;
        }

        return cached;
    }

    clearCache(provider?: string): void {
        if (provider) {
            storage.removeItem(`model_cache_${provider}`);
        } else {
            // Clear all model caches
            SUPPORTED_PROVIDERS.forEach((p) => {
                storage.removeItem(`model_cache_${p}`);
            });
        }
    }

    async fetchModels(
        provider: string,
        apiKey: string,
        customEndpoint?: string
    ): Promise<ModelDiscoveryResult> {
        // Check cache first
        const cached = this.getCachedModels(provider);
        if (cached) {
            log.debug(`Using cached models for ${provider}`);
            return cached;
        }

        if (!this.supportsModelListing(provider)) {
            return {
                models: [],
                error: `Provider ${provider} does not support model listing`,
            };
        }

        if (!apiKey) {
            return {
                models: [],
                error: 'API key is required',
            };
        }

        const endpoint = customEndpoint || PROVIDER_ENDPOINTS[provider];
        if (!endpoint) {
            return {
                models: [],
                error: `Unknown provider: ${provider}`,
            };
        }

        try {
            log.debug(`Fetching models from ${provider}...`);

            const headers = this.buildHeaders(provider, apiKey);
            const url = this.buildUrl(provider, endpoint, apiKey);

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                const errorText = await response.text();
                log.error(`Failed to fetch models from ${provider}:`, errorText);
                return {
                    models: [],
                    error: `API error: ${response.status} - ${errorText}`,
                };
            }

            const data = await response.json();
            const models = this.parseResponse(provider, data);

            // Cache the result
            const result: ModelDiscoveryResult = {
                models,
                cachedAt: Date.now(),
            };

            storage.setItem(`model_cache_${provider}`, result);
            log.info(`Fetched ${models.length} models from ${provider}`);

            return result;
        } catch (error) {
            log.error(`Error fetching models from ${provider}:`, error);
            return {
                models: [],
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    private buildHeaders(provider: string, apiKey: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        switch (provider) {
            case 'anthropic':
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2024-01-01';
                break;
            case 'cohere':
                headers['Authorization'] = `Bearer ${apiKey}`;
                headers['X-Client-Name'] = 'become-an-author';
                break;
            case 'google':
                // Google uses query param, not header
                break;
            default:
                // OpenAI-compatible providers
                headers['Authorization'] = `Bearer ${apiKey}`;
                break;
        }

        return headers;
    }

    private buildUrl(provider: string, endpoint: string, apiKey: string): string {
        if (provider === 'google') {
            // Google uses API key as query param
            return `${endpoint}?key=${apiKey}`;
        }
        return endpoint;
    }

    private parseResponse(provider: string, data: unknown): AIModel[] {
        try {
            switch (provider) {
                case 'openai':
                case 'groq':
                case 'mistral':
                case 'deepseek':
                case 'xai':
                case 'togetherai':
                case 'fireworks':
                    return parseOpenAIResponse(data as Parameters<typeof parseOpenAIResponse>[0], provider);

                case 'anthropic':
                    return parseAnthropicResponse(data as Parameters<typeof parseAnthropicResponse>[0], provider);

                case 'google':
                    return parseGoogleResponse(data as Parameters<typeof parseGoogleResponse>[0], provider);

                case 'openrouter':
                    return parseOpenRouterResponse(data as Parameters<typeof parseOpenRouterResponse>[0], provider);

                case 'cohere':
                    // Cohere has a different response format
                    const cohereData = data as { models: Array<{ name: string }> };
                    return cohereData.models.map((m) => ({
                        id: m.name,
                        name: m.name,
                        provider,
                    }));

                case 'perplexity':
                    // Perplexity doesn't have a list endpoint - return known models
                    return [
                        { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small', provider },
                        { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large', provider },
                        { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge', provider },
                    ];

                default:
                    log.warn(`Unknown provider format: ${provider}`);
                    return [];
            }
        } catch (error) {
            log.error(`Failed to parse response from ${provider}:`, error);
            return [];
        }
    }
}

// Export singleton instance
export const modelDiscoveryService = ModelDiscoveryService.getInstance();
