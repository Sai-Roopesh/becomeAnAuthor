/**
 * AI Vendor Configurations
 * Defines all supported AI vendors and their settings
 * Supports 14 providers via Vercel AI SDK
 */

export type AIProvider =
  | "openrouter"
  | "google"
  | "anthropic"
  | "openai"
  | "mistral"
  | "deepseek"
  | "groq"
  | "cohere"
  | "xai"
  | "azure"
  | "togetherai"
  | "fireworks"
  | "perplexity"
  | "kimi";

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
    id: "openrouter",
    name: "OpenRouter",
    description: "Access 100+ models through a unified API",
    icon: "🔀",
    setupUrl: "https://openrouter.ai/keys",
    requiresAuth: true,
    // OpenRouter models fetched dynamically (only provider with reliable list endpoint)
  },
  google: {
    id: "google",
    name: "Google AI Studio",
    description: "Gemini 3 Flash, Pro, Deep Think",
    icon: "🔷",
    setupUrl: "https://aistudio.google.com/app/apikey",
    requiresAuth: true,
    defaultModels: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash-thinking",
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude Opus 4.5, Sonnet 4.5, Haiku 4.5",
    icon: "🧠",
    setupUrl: "https://console.anthropic.com/settings/keys",
    requiresAuth: true,
    defaultModels: [
      "claude-sonnet-4-20250514",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-haiku-20241022",
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI / Local",
    description: "GPT-5.2, o1, or compatible endpoints (LM Studio, Ollama)",
    icon: "⚡",
    setupUrl: "https://platform.openai.com/api-keys",
    requiresAuth: false,
    defaultModels: ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3", "o4-mini"],
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    description: "Mistral Large, Small models",
    icon: "🌫️",
    setupUrl: "https://console.mistral.ai/api-keys/",
    requiresAuth: true,
    defaultModels: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "codestral-latest",
    ],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek Chat and Reasoner",
    icon: "🔍",
    setupUrl: "https://platform.deepseek.com/api_keys",
    requiresAuth: true,
    defaultModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  groq: {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference (Llama, Mixtral)",
    icon: "⚡",
    setupUrl: "https://console.groq.com/keys",
    requiresAuth: true,
    defaultModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
  },
  cohere: {
    id: "cohere",
    name: "Cohere",
    description: "Command R+ models",
    icon: "📊",
    setupUrl: "https://dashboard.cohere.com/api-keys",
    requiresAuth: true,
    defaultModels: ["command-r-plus", "command-r", "command-light"],
  },
  xai: {
    id: "xai",
    name: "xAI Grok",
    description: "Grok models",
    icon: "🤖",
    setupUrl: "https://x.ai/",
    requiresAuth: true,
    defaultModels: ["grok-2", "grok-2-mini"],
  },
  azure: {
    id: "azure",
    name: "Azure OpenAI",
    description: "Azure-hosted OpenAI models",
    icon: "☁️",
    setupUrl: "https://portal.azure.com/",
    requiresAuth: true,
    // Azure models depend on deployment - user must configure
  },
  togetherai: {
    id: "togetherai",
    name: "Together.ai",
    description: "Open-source models hosted",
    icon: "🤝",
    setupUrl: "https://api.together.xyz/settings/api-keys",
    requiresAuth: true,
    defaultModels: [
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
  },
  fireworks: {
    id: "fireworks",
    name: "Fireworks",
    description: "Fine-tuned models",
    icon: "🎆",
    setupUrl: "https://fireworks.ai/account/api-keys",
    requiresAuth: true,
    defaultModels: [
      "accounts/fireworks/models/llama-v3p1-70b-instruct",
      "accounts/fireworks/models/llama-v3p1-8b-instruct",
    ],
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    description: "Search-augmented AI",
    icon: "🔎",
    setupUrl: "https://www.perplexity.ai/settings/api",
    requiresAuth: true,
    defaultModels: [
      "llama-3.1-sonar-small-128k-online",
      "llama-3.1-sonar-large-128k-online",
      "llama-3.1-sonar-huge-128k-online",
    ],
  },
  kimi: {
    id: "kimi",
    name: "Kimi (Moonshot)",
    description: "Kimi models",
    icon: "🌙",
    setupUrl: "https://platform.moonshot.cn/console/api-keys",
    requiresAuth: true,
    defaultModels: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
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
    case "openrouter":
      return apiKey.startsWith("sk-or-");
    case "google":
      return apiKey.startsWith("AIza");
    case "anthropic":
      return apiKey.startsWith("sk-ant-");
    case "groq":
      return apiKey.startsWith("gsk_");
    case "deepseek":
      return apiKey.startsWith("sk-");
    case "mistral":
      return apiKey.length >= 32; // Mistral keys are 32+ chars
    case "openai":
      return true; // Optional for compatible endpoints
    default:
      return apiKey.length > 10; // Basic length check
  }
}
