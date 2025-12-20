/**
 * AI Vendor Configurations
 * Defines all supported AI vendors and their settings
 */

export type AIProvider = 'openrouter' | 'google' | 'mistral' | 'openai' | 'kimi' | 'anthropic';

export interface AIVendor {
    id: AIProvider;
    name: string;
    description: string;
    apiEndpoint: string;
    modelsEndpoint?: string;
    apiKeyFormat: string;
    apiKeyPlaceholder: string;
    setupUrl: string;
    icon: string;
    defaultModels?: string[];
    requiresAuth: boolean;
}

export const AI_VENDORS: Record<AIProvider, AIVendor> = {
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access to multiple AI models through a unified API',
        apiEndpoint: 'https://openrouter.ai/api/v1',
        modelsEndpoint: 'https://openrouter.ai/api/v1/models',
        apiKeyFormat: 'sk-or-v1-...',
        apiKeyPlaceholder: 'sk-or-v1-...',
        setupUrl: 'https://openrouter.ai/keys',
        icon: '🔀',
        requiresAuth: true,
    },
    google: {
        id: 'google',
        name: 'Google AI Studio',
        description: 'Google Gemini models (2.0, 1.5 Pro/Flash, etc.)',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
        modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        apiKeyFormat: 'AIza...',
        apiKeyPlaceholder: 'AIzaSy...',
        setupUrl: 'https://aistudio.google.com/app/apikey',
        icon: '🔷',
        defaultModels: [
            'gemini-2.0-flash',
            'gemini-2.0-flash-001',
            'gemini-2.0-flash-exp',
            'gemini-2.0-flash-lite-preview-02-05',
            'gemini-2.0-flash-thinking-exp',
            'gemini-2.0-flash-thinking-exp-01-21',
            'gemini-2.0-pro-exp',
            'gemini-2.0-pro-exp-02-05',
            'gemini-2.5-flash',
            'gemini-2.5-flash-image',
            'gemini-2.5-flash-lite-preview-09-25',
            'gemini-2.5-flash-preview-09-25',
            'gemini-2.5-pro-preview-03-25',
            'gemini-2.5-pro-preview-04-05',
            'gemini-3-pro-preview',
            'gemini-3-pro-image-preview',
            'gemini-exp-1206',
            'gemini-flash-latest',
            'gemini-pro-latest',
        ],
        requiresAuth: true,
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral AI',
        description: 'Mistral Large, Medium, and Small models',
        apiEndpoint: 'https://api.mistral.ai/v1',
        modelsEndpoint: 'https://api.mistral.ai/v1/models',
        apiKeyFormat: 'Standard bearer token',
        apiKeyPlaceholder: 'Enter Mistral API key...',
        setupUrl: 'https://console.mistral.ai/api-keys/',
        icon: '🌫️',
        defaultModels: [
            'mistral-large-latest',
            'mistral-medium-latest',
            'mistral-small-latest',
            'mistral-nemo:free',
        ],
        requiresAuth: true,
    },
    openai: {
        id: 'openai',
        name: 'OpenAI Compatible',
        description: 'OpenAI API or compatible endpoints (LM Studio, Ollama, etc.)',
        apiEndpoint: 'Custom',
        apiKeyFormat: 'Optional (depends on endpoint)',
        apiKeyPlaceholder: 'sk-... (if required)',
        setupUrl: 'https://platform.openai.com/api-keys',
        icon: '⚡',
        defaultModels: [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-3.5-turbo',
        ],
        requiresAuth: false,
    },
    kimi: {
        id: 'kimi',
        name: 'Kimi-LLM',
        description: 'Moonshot AI Kimi models',
        apiEndpoint: 'https://api.moonshot.cn/v1',
        modelsEndpoint: 'https://api.moonshot.cn/v1/models',
        apiKeyFormat: 'Standard bearer token',
        apiKeyPlaceholder: 'Enter Kimi API key...',
        setupUrl: 'https://platform.moonshot.cn/console/api-keys',
        icon: '🌙',
        defaultModels: [
            'kimi-v1-405b',
            'kimi-v1-fast',
        ],
        requiresAuth: true,
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Claude models (Opus, Sonnet, Haiku)',
        apiEndpoint: 'https://api.anthropic.com/v1',
        modelsEndpoint: 'https://api.anthropic.com/v1/models',
        apiKeyFormat: 'sk-ant-...',
        apiKeyPlaceholder: 'sk-ant-api03-...',
        setupUrl: 'https://console.anthropic.com/settings/keys',
        icon: '🧠',
        defaultModels: [
            'claude-3-5-sonnet-latest',
            'claude-3-5-haiku-latest',
            'claude-3-opus-latest',
        ],
        requiresAuth: true,
    },
};

export interface AIConnection {
    id: string;
    name: string;
    provider: AIProvider;
    apiKey: string;
    customEndpoint?: string; // For OpenAI compatible
    enabled: boolean;
    models?: string[];
    createdAt: number;
    updatedAt: number;
}

/**
 * Get all AI vendor configurations
 */
export function getAllVendors(): AIVendor[] {
    return Object.values(AI_VENDORS);
}

/**
 * Get vendor by ID
 */
export function getVendor(id: AIProvider): AIVendor | undefined {
    return AI_VENDORS[id];
}

/**
 * Check if API key format is valid for vendor
 */
export function validateApiKey(provider: AIProvider, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) return false;

    const vendor = getVendor(provider);
    if (!vendor) return false;

    switch (provider) {
        case 'openrouter':
            return apiKey.startsWith('sk-or-');
        case 'google':
            return apiKey.startsWith('AIza');
        case 'mistral':
        case 'kimi':
            return apiKey.length > 10; // Basic length check
        case 'openai':
            return true; // OpenAI compatible can have various formats
        case 'anthropic':
            return apiKey.startsWith('sk-ant-');
        default:
            return true;
    }
}
