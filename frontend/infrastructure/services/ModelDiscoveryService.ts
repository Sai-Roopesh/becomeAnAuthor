/**
 * Model Discovery Service
 *
 * Fetches available AI models from provider APIs with fallback to defaults.
 *
 * Strategy:
 * - Try dynamic fetch for providers with reliable APIs
 * - Fall back to curated defaults from ai-vendors.ts on failure
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

// Provider API endpoints for model listing
const MODEL_ENDPOINTS: Record<string, string> = {
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
 * Attempts dynamic fetch, falls back to curated defaults.
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
    return provider in AI_VENDORS;
  }

  getCachedModels(provider: string): ModelDiscoveryResult | null {
    const cacheKey = `model_cache_${provider}`;
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
      storage.removeItem(`model_cache_${provider}`);
    } else {
      Object.keys(AI_VENDORS).forEach((p) => {
        storage.removeItem(`model_cache_${p}`);
      });
    }
  }

  /**
   * Get models for a provider.
   *
   * 1. Check cache first
   * 2. Try dynamic fetch from provider API
   * 3. Fall back to static defaults on failure
   */
  async fetchModels(
    provider: string,
    apiKey: string,
    customEndpoint?: string,
  ): Promise<ModelDiscoveryResult> {
    // Check cache first
    const cached = this.getCachedModels(provider);
    if (cached) {
      log.debug(`Using cached models for ${provider}`);
      return cached;
    }

    // Try dynamic fetch if we have an endpoint and API key
    const endpoint = MODEL_ENDPOINTS[provider];
    if (endpoint && apiKey) {
      const dynamicResult = await this.fetchFromApi(
        provider,
        apiKey,
        customEndpoint || endpoint,
      );
      if (dynamicResult.models.length > 0) {
        return dynamicResult;
      }
      // Dynamic fetch failed, fall through to defaults
      log.debug(`Dynamic fetch failed for ${provider}, using defaults`);
    }

    // Return static defaults from config
    return this.getDefaultModels(provider);
  }

  /**
   * Fetch models from provider API
   */
  private async fetchFromApi(
    provider: string,
    apiKey: string,
    endpoint: string,
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
        log.warn(`API error from ${provider}: ${response.status}`);
        return { models: [], error: `API error: ${response.status}` };
      }

      const data = await response.json();
      const models = this.parseResponse(provider, data);

      // Cache successful result
      const result: ModelDiscoveryResult = {
        models,
        cachedAt: Date.now(),
      };

      storage.setItem(`model_cache_${provider}`, result);
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
        headers["Authorization"] = `Bearer ${apiKey}`;
        break;
    }

    return headers;
  }

  private buildUrl(provider: string, endpoint: string, apiKey: string): string {
    if (provider === "google") {
      return `${endpoint}?key=${apiKey}`;
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
    const response = data as { data: Array<{ id: string; owned_by?: string }> };
    return (response.data || [])
      .filter((m) => {
        const id = m.id.toLowerCase();
        return (
          !id.includes("embedding") &&
          !id.includes("whisper") &&
          !id.includes("tts") &&
          !id.includes("dall-e") &&
          !id.includes("moderation")
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
      data: Array<{ id: string; display_name?: string; type: string }>;
    };
    return (response.data || [])
      .filter((m) => m.type === "model")
      .map((m) => ({
        id: m.id,
        name: m.display_name || m.id,
        provider,
      }));
  }

  private parseGoogleFormat(data: unknown, provider: string): AIModel[] {
    const response = data as {
      models: Array<{ name: string; displayName: string }>;
    };
    return (response.models || [])
      .filter((m) => {
        const name = m.name.toLowerCase();
        return name.includes("gemini") && !name.includes("embedding");
      })
      .map((m) => ({
        id: m.name.replace("models/", ""),
        name: m.displayName || m.name.replace("models/", ""),
        provider,
      }));
  }

  private parseOpenRouterFormat(data: unknown, provider: string): AIModel[] {
    const response = data as {
      data: Array<{ id: string; name?: string; context_length?: number }>;
    };
    return (response.data || [])
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

  /**
   * Get default models from vendor config
   */
  private getDefaultModels(provider: string): ModelDiscoveryResult {
    const vendor = AI_VENDORS[provider as AIProvider];

    if (!vendor) {
      return {
        models: [],
        error: `Unknown provider: ${provider}`,
      };
    }

    const defaultModels = vendor.defaultModels || [];
    const models: AIModel[] = defaultModels.map((id) => ({
      id,
      name: id,
      provider,
    }));

    // Cache the result
    const result: ModelDiscoveryResult = {
      models,
      cachedAt: Date.now(),
    };

    storage.setItem(`model_cache_${provider}`, result);
    log.debug(`Returning ${models.length} default models for ${provider}`);

    return result;
  }
}

// Export singleton instance
export const modelDiscoveryService = ModelDiscoveryService.getInstance();
