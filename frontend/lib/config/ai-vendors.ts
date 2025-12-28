/**
 * AI Vendor Configurations
 * Defines all supported AI vendors and their settings
 * Supports 14 providers via Vercel AI SDK
 */

export type AIProvider =
    | 'openrouter' | 'google' | 'anthropic' | 'openai' | 'mistral'
    | 'deepseek' | 'groq' | 'cohere' | 'xai'
    | 'azure' | 'togetherai' | 'fireworks' | 'perplexity' | 'kimi';

export interface AIVendor {
    id: AIProvider;
    name: string;
    description: string;
    icon: string;
    setupUrl: string;
    requiresAuth: boolean;
    defaultModels?: string[];
    apiKeyPlaceholder?: string;
}

export const AI_VENDORS: Record<AIProvider, AIVendor> = {
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access 100+ models through a unified API',
        icon: '🔀',
        setupUrl: 'https://openrouter.ai/keys',
        requiresAuth: true,
    },
    google: {
        id: 'google',
        name: 'Google AI Studio',
        description: 'Gemini models (2.5, 3.0)',
        icon: '🔷',
        setupUrl: 'https://aistudio.google.com/app/apikey',
        requiresAuth: true,
        defaultModels: ['gemini-2.5-flash', 'gemini-2.5-pro-preview-03-25', 'gemini-3-pro-preview'],
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Claude models (3.5, 4)',
        icon: '🧠',
        setupUrl: 'https://console.anthropic.com/settings/keys',
        requiresAuth: true,
        defaultModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    },
    openai: {
        id: 'openai',
        name: 'OpenAI / Local',
        description: 'OpenAI or compatible endpoints (LM Studio, Ollama)',
        icon: '⚡',
        setupUrl: 'https://platform.openai.com/api-keys',
        requiresAuth: false,
        defaultModels: ['gpt-4o', 'gpt-4o-mini'],
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral AI',
        description: 'Mistral Large, Small models',
        icon: '🌫️',
        setupUrl: 'https://console.mistral.ai/api-keys/',
        requiresAuth: true,
        defaultModels: ['mistral-large-latest', 'mistral-small-latest'],
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        description: 'DeepSeek Chat and Reasoner',
        icon: '🔍',
        setupUrl: 'https://platform.deepseek.com/api_keys',
        requiresAuth: true,
        defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
    },
    groq: {
        id: 'groq',
        name: 'Groq',
        description: 'Ultra-fast inference (Llama, Mixtral)',
        icon: '⚡',
        setupUrl: 'https://console.groq.com/keys',
        requiresAuth: true,
        defaultModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    },
    cohere: {
        id: 'cohere',
        name: 'Cohere',
        description: 'Command R+ models',
        icon: '📊',
        setupUrl: 'https://dashboard.cohere.com/api-keys',
        requiresAuth: true,
        defaultModels: ['command-r-plus', 'command-r'],
    },
    xai: {
        id: 'xai',
        name: 'xAI Grok',
        description: 'Grok models',
        icon: '🤖',
        setupUrl: 'https://x.ai/',
        requiresAuth: true,
        defaultModels: ['grok-2', 'grok-2-mini'],
    },
    azure: {
        id: 'azure',
        name: 'Azure OpenAI',
        description: 'Azure-hosted OpenAI models',
        icon: '☁️',
        setupUrl: 'https://portal.azure.com/',
        requiresAuth: true,
    },
    togetherai: {
        id: 'togetherai',
        name: 'Together.ai',
        description: 'Open-source models hosted',
        icon: '🤝',
        setupUrl: 'https://api.together.xyz/settings/api-keys',
        requiresAuth: true,
        defaultModels: ['meta-llama/Llama-3-70b-chat-hf'],
    },
    fireworks: {
        id: 'fireworks',
        name: 'Fireworks',
        description: 'Fine-tuned models',
        icon: '🎆',
        setupUrl: 'https://fireworks.ai/account/api-keys',
        requiresAuth: true,
    },
    perplexity: {
        id: 'perplexity',
        name: 'Perplexity',
        description: 'Search-augmented AI',
        icon: '🔎',
        setupUrl: 'https://www.perplexity.ai/settings/api',
        requiresAuth: true,
        defaultModels: ['llama-3.1-sonar-small-128k-online'],
    },
    kimi: {
        id: 'kimi',
        name: 'Kimi (Moonshot)',
        description: 'Kimi models',
        icon: '🌙',
        setupUrl: 'https://platform.moonshot.cn/console/api-keys',
        requiresAuth: true,
        defaultModels: ['kimi-v1-405b'],
    },
};

export interface AIConnection {
    id: string;
    name: string;
    provider: AIProvider;
    apiKey: string;
    customEndpoint?: string;
    enabled: boolean;
    models?: string[];
    createdAt: number;
    updatedAt: number;
}

export function getAllVendors(): AIVendor[] {
    return Object.values(AI_VENDORS);
}

export function getVendor(id: AIProvider): AIVendor | undefined {
    return AI_VENDORS[id];
}

/**
 * Validate API key format for a provider.
 * Most providers just check for non-empty string.
 */
export function validateApiKey(provider: AIProvider, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) return false;

    switch (provider) {
        case 'openrouter':
            return apiKey.startsWith('sk-or-');
        case 'google':
            return apiKey.startsWith('AIza');
        case 'anthropic':
            return apiKey.startsWith('sk-ant-');
        case 'openai':
            return true; // Optional for compatible endpoints
        default:
            return apiKey.length > 10; // Basic length check
    }
}

