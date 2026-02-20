/**
 * Model Discovery Service
 *
 * Fetches available AI models from provider APIs.
 *
 * Strategy:
 * - Use dynamic fetch for providers with model-listing endpoints
 * - Require manual model IDs when listing endpoints are unavailable
 * - Cache results to avoid repeated API calls
 *
 * @see CODING_GUIDELINES.md - 8-Layer Architecture, Layer 5 (Infrastructure)
 */

import type {
  IModelDiscoveryService,
  AIModel,
  ModelDiscoveryResult,
} from "@/domain/services/IModelDiscoveryService";
import { AI_VENDORS, type AIProvider } from "@/lib/config/ai-vendors";
import { logger } from "@/shared/utils/logger";
import { storage } from "@/core/storage/safe-storage";
import { CACHE_CONSTANTS } from "@/lib/config/constants";

const log = logger.scope("ModelDiscoveryService");

const CACHE_PREFIX = "model_cache_";

// Provider API endpoints with reliable model listing support
const MODEL_ENDPOINTS: Partial<Record<AIProvider, string>> = {
  openai: "https://api.openai.com/v1/models",
  anthropic: "https://api.anthropic.com/v1/models",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
  mistral: "https://api.mistral.ai/v1/models",
  deepseek: "https://api.deepseek.com/v1/models",
};

/**
 * ModelDiscoveryService - Returns available models for AI providers
 *
 * Uses dynamic provider APIs where available.
 */
export class ModelDiscoveryService implements IModelDiscoveryService {
  private static instance: ModelDiscoveryService;

  private constructor() {}

  static getInstance(): ModelDiscoveryService {
    if (!ModelDiscoveryService.instance) {
      ModelDiscoveryService.instance = new ModelDiscoveryService();
    }
    return ModelDiscoveryService.instance;
  }

  supportsModelListing(provider: string): boolean {
    return provider in MODEL_ENDPOINTS;
  }

  getCachedModels(provider: string): ModelDiscoveryResult | null {
    const cacheKey = this.getCacheKey(provider);
    return this.getCachedModelsForKey(cacheKey);
  }

  private getCachedModelsForKey(cacheKey: string): ModelDiscoveryResult | null {
    const cached = storage.getItem<ModelDiscoveryResult | null>(cacheKey, null);

    if (!cached || !cached.cachedAt) return null;

    if (Date.now() - cached.cachedAt > CACHE_CONSTANTS.MODEL_CACHE_TTL_MS) {
      storage.removeItem(cacheKey);
      return null;
    }

    return cached;
  }

  clearCache(provider?: string): void {
    if (provider) {
      this.clearCacheByPrefix(`${CACHE_PREFIX}${provider}`);
    } else {
      this.clearCacheByPrefix(CACHE_PREFIX);
    }
  }

  private clearCacheByPrefix(prefix: string): void {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        storage.removeItem(key);
      }
    });
  }

  private getCacheKey(provider: string, endpoint?: string): string {
    if (!endpoint) return `${CACHE_PREFIX}${provider}`;
    return `${CACHE_PREFIX}${provider}_${encodeURIComponent(endpoint.toLowerCase())}`;
  }

  private normalizeOpenAIEndpoint(endpoint: string): string {
    const trimmed = endpoint.trim();
    if (!trimmed) {
      return MODEL_ENDPOINTS.openai || "https://api.openai.com/v1/models";
    }

    try {
      const url = new URL(trimmed);
      const path = url.pathname.replace(/\/+$/, "");

      if (path.endsWith("/models")) return url.toString();
      if (!path || path === "/") {
        url.pathname = "/v1/models";
        return url.toString();
      }
      if (path.endsWith("/chat/completions")) {
        url.pathname = path.replace(/\/chat\/completions$/, "/models");
        return url.toString();
      }
      if (path.endsWith("/completions")) {
        url.pathname = path.replace(/\/completions$/, "/models");
        return url.toString();
      }
      if (path.endsWith("/v1")) {
        url.pathname = `${path}/models`;
        return url.toString();
      }

      url.pathname = `${path}/models`;
      return url.toString();
    } catch {
      const normalized = trimmed.replace(/\/+$/, "");
      if (normalized.endsWith("/models")) return normalized;
      if (normalized.endsWith("/chat/completions")) {
        return normalized.replace(/\/chat\/completions$/, "/models");
      }
      if (normalized.endsWith("/completions")) {
        return normalized.replace(/\/completions$/, "/models");
      }
      if (normalized.endsWith("/v1")) return `${normalized}/models`;
      return `${normalized}/models`;
    }
  }

  private resolveEndpoint(provider: string, customEndpoint?: string): string {
    const normalizedCustom = customEndpoint?.trim();

    if (provider === "openai") {
      const endpoint = normalizedCustom || MODEL_ENDPOINTS.openai || "";
      return this.normalizeOpenAIEndpoint(endpoint);
    }

    if (normalizedCustom) return normalizedCustom;
    return MODEL_ENDPOINTS[provider as AIProvider] || "";
  }

  private requiresApiKeyForListing(
    provider: string,
    endpoint: string,
  ): boolean {
    if (provider !== "openai") return true;

    const openAIDefault = this.normalizeOpenAIEndpoint(
      MODEL_ENDPOINTS.openai || "https://api.openai.com/v1/models",
    );
    return endpoint === openAIDefault;
  }

  private providerDisplayName(provider: string): string {
    return AI_VENDORS[provider as AIProvider]?.name || provider;
  }

  private noModelsError(provider: string): string {
    return `No compatible text models returned by ${this.providerDisplayName(provider)}.`;
  }

  private dynamicFetchError(provider: string, error?: string): string {
    if (error) {
      return `Failed to fetch models from ${this.providerDisplayName(provider)}: ${error}`;
    }
    return `Failed to fetch models from ${this.providerDisplayName(provider)}.`;
  }

  /**
   * Get models for a provider.
   *
   * 1. Check cache first
   * 2. Try dynamic fetch for providers with model-list APIs
   * 3. Require manual model IDs for providers without listing APIs
   */
  async fetchModels(
    provider: string,
    apiKey: string,
    customEndpoint?: string,
  ): Promise<ModelDiscoveryResult> {
    const endpoint = this.resolveEndpoint(provider, customEndpoint);
    const cacheKey = this.getCacheKey(provider, endpoint || undefined);

    // Check cache first
    const cached = this.getCachedModelsForKey(cacheKey);
    if (cached) {
      log.debug(`Using cached models for ${provider}`);
      return cached;
    }

    // Providers without a model-list API require manual model IDs.
    if (!this.supportsModelListing(provider)) {
      return {
        models: [],
        error: `${this.providerDisplayName(provider)} does not support automatic model discovery in this app. Enter model IDs manually.`,
      };
    }

    // Listing provider with missing required auth should return a real error.
    if (this.requiresApiKeyForListing(provider, endpoint) && !apiKey.trim()) {
      return {
        models: [],
        error: `${this.providerDisplayName(provider)} API key is required to fetch models.`,
      };
    }

    // Try dynamic fetch.
    const dynamicResult = await this.fetchFromApi(
      provider,
      apiKey.trim(),
      endpoint,
      cacheKey,
    );

    if (dynamicResult.models.length > 0) {
      return dynamicResult;
    }

    if (dynamicResult.error) {
      return {
        models: [],
        error: this.dynamicFetchError(provider, dynamicResult.error),
      };
    }

    return {
      models: [],
      error: this.noModelsError(provider),
    };
  }

  /**
   * Fetch models from provider API
   */
  private async fetchFromApi(
    provider: string,
    apiKey: string,
    endpoint: string,
    cacheKey: string,
  ): Promise<ModelDiscoveryResult> {
    try {
      log.debug(`Fetching models from ${provider}...`);

      const headers = this.buildHeaders(provider, apiKey);
      const url = this.buildUrl(provider, endpoint, apiKey);

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        let apiError = `${response.status}`;
        try {
          const payload = await response.json();
          const message =
            (payload as { error?: { message?: string } }).error?.message ||
            (payload as { message?: string }).message;
          if (message) {
            apiError = `${response.status} ${message}`;
          }
        } catch {
          // Ignore JSON parse errors and keep status-only message.
        }

        log.warn(`API error from ${provider}: ${apiError}`);
        return { models: [], error: apiError };
      }

      const data = await response.json();
      const models = this.parseResponse(provider, data);

      if (models.length === 0) {
        return {
          models: [],
          error: this.noModelsError(provider),
        };
      }

      // Cache successful non-empty result.
      const result: ModelDiscoveryResult = {
        models,
        cachedAt: Date.now(),
      };

      storage.setItem(cacheKey, result);
      log.info(`Fetched ${models.length} models from ${provider}`);

      return result;
    } catch (error) {
      log.warn(
        `Failed to fetch models from ${provider}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        models: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private buildHeaders(
    provider: string,
    apiKey: string,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    switch (provider) {
      case "anthropic":
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2024-01-01";
        break;
      case "google":
        // Google uses query param, not header
        break;
      default:
        // OpenAI-compatible providers
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
        break;
    }

    return headers;
  }

  private buildUrl(provider: string, endpoint: string, apiKey: string): string {
    if (provider === "google") {
      const separator = endpoint.includes("?") ? "&" : "?";
      return `${endpoint}${separator}key=${encodeURIComponent(apiKey)}`;
    }
    return endpoint;
  }

  private parseResponse(provider: string, data: unknown): AIModel[] {
    try {
      switch (provider) {
        case "openai":
        case "groq":
        case "mistral":
        case "deepseek":
          return this.parseOpenAIFormat(data, provider);

        case "anthropic":
          return this.parseAnthropicFormat(data, provider);

        case "google":
          return this.parseGoogleFormat(data, provider);

        case "openrouter":
          return this.parseOpenRouterFormat(data, provider);

        default:
          return [];
      }
    } catch (error) {
      log.error(`Failed to parse response from ${provider}:`, error);
      return [];
    }
  }

  private parseOpenAIFormat(data: unknown, provider: string): AIModel[] {
    const response = data as {
      data?: Array<{ id?: string; owned_by?: string }>;
    };
    return (response.data || [])
      .filter((m): m is { id: string; owned_by?: string } => !!m.id)
      .filter((m) => {
        const id = m.id.toLowerCase();
        return (
          !id.includes("embedding") &&
          !id.includes("embed") &&
          !id.includes("whisper") &&
          !id.includes("audio") &&
          !id.includes("tts") &&
          !id.includes("image") &&
          !id.includes("dall-e") &&
          !id.includes("moderation") &&
          !id.includes("omni-moderation")
        );
      })
      .map((m) => ({
        id: m.id,
        name: m.id,
        provider,
      }))
      .slice(0, 50); // Limit results
  }

  private parseAnthropicFormat(data: unknown, provider: string): AIModel[] {
    const response = data as {
      data?: Array<{ id?: string; display_name?: string; type?: string }>;
    };
    return (response.data || [])
      .filter(
        (m): m is { id: string; display_name?: string; type?: string } =>
          !!m.id && m.type === "model",
      )
      .map((m) => ({
        id: m.id,
        name: m.display_name || m.id,
        provider,
      }));
  }

  private parseGoogleFormat(data: unknown, provider: string): AIModel[] {
    const response = data as {
      models?: Array<{
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    return (response.models || [])
      .filter(
        (
          m,
        ): m is {
          name: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        } => !!m.name,
      )
      .filter((m) => {
        const name = m.name.toLowerCase();
        const supportsGenerateContent = Array.isArray(
          m.supportedGenerationMethods,
        )
          ? m.supportedGenerationMethods.includes("generateContent")
          : true;
        return (
          supportsGenerateContent &&
          name.includes("gemini") &&
          !name.includes("embedding")
        );
      })
      .map((m) => ({
        id: m.name.replace("models/", ""),
        name: m.displayName || m.name.replace("models/", ""),
        provider,
      }));
  }

  private parseOpenRouterFormat(data: unknown, provider: string): AIModel[] {
    const response = data as {
      data?: Array<{ id?: string; name?: string; context_length?: number }>;
    };
    return (response.data || [])
      .filter(
        (m): m is { id: string; name?: string; context_length?: number } =>
          !!m.id,
      )
      .filter((m) => {
        const id = m.id.toLowerCase();
        return (
          !id.includes("vision") &&
          !id.includes("image") &&
          !id.includes("audio")
        );
      })
      .slice(0, 100)
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
      });
  }
}

// Export singleton instance
export const modelDiscoveryService = ModelDiscoveryService.getInstance();
