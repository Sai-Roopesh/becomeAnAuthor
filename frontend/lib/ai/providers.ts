import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGroq } from '@ai-sdk/groq';
import { createCohere } from '@ai-sdk/cohere';
import { createXai } from '@ai-sdk/xai';
import { createAzure } from '@ai-sdk/azure';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createFireworks } from '@ai-sdk/fireworks';
import { createPerplexity } from '@ai-sdk/perplexity';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { AIConnection } from '@/lib/config/ai-vendors';

/**
 * Creates an AI model instance from a connection configuration.
 * 
 * Supports 14 providers:
 * - openai, anthropic, google, mistral, deepseek, groq
 * - cohere, xai, azure, togetherai, fireworks, perplexity, openrouter
 * - kimi (via OpenAI-compatible endpoint)
 */
export function getModel(connection: AIConnection, modelId: string) {
    const { provider, apiKey, customEndpoint } = connection;

    // Use loose typing to accommodate different SDK versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers: Record<string, () => any> = {
        openai: () => createOpenAI({ apiKey, ...(customEndpoint && { baseURL: customEndpoint }) }),
        anthropic: () => createAnthropic({ apiKey }),
        google: () => createGoogleGenerativeAI({ apiKey }),
        mistral: () => createMistral({ apiKey }),
        deepseek: () => createDeepSeek({ apiKey }),
        groq: () => createGroq({ apiKey }),
        cohere: () => createCohere({ apiKey }),
        xai: () => createXai({ apiKey }),
        azure: () => createAzure({ apiKey, ...(customEndpoint && { baseURL: customEndpoint }) }),
        togetherai: () => createTogetherAI({ apiKey }),
        fireworks: () => createFireworks({ apiKey }),
        perplexity: () => createPerplexity({ apiKey }),
        openrouter: () => createOpenRouter({ apiKey }),
        // Kimi uses OpenAI-compatible API
        kimi: () => createOpenAI({ apiKey, baseURL: 'https://api.moonshot.cn/v1' }),
    };

    const factory = providers[provider];
    if (!factory) {
        throw new Error(`Unknown AI provider: ${provider}`);
    }

    return factory()(modelId);
}

