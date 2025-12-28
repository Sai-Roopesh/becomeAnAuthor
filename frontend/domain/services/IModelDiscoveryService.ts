/**
 * Model Discovery Service Interface
 *
 * Defines the contract for fetching available AI models from providers.
 * Each provider implements this interface to fetch models from their API.
 *
 * @see CODING_GUIDELINES.md - 8-Layer Architecture
 */

export interface AIModel {
    id: string;
    name: string;
    provider: string;
    contextWindow?: number;
    maxOutputTokens?: number;
    deprecated?: boolean;
}

export interface ModelDiscoveryResult {
    models: AIModel[];
    error?: string;
    cachedAt?: number;
}

/**
 * Interface for model discovery service
 * Responsible for fetching available models from AI providers
 */
export interface IModelDiscoveryService {
    /**
     * Fetch available models from a provider
     * @param provider - Provider ID (e.g., 'openai', 'anthropic', 'google')
     * @param apiKey - API key for authentication
     * @param customEndpoint - Optional custom API endpoint
     * @returns Promise<ModelDiscoveryResult>
     */
    fetchModels(
        provider: string,
        apiKey: string,
        customEndpoint?: string
    ): Promise<ModelDiscoveryResult>;

    /**
     * Get cached models for a provider (if available)
     * @param provider - Provider ID
     * @returns Cached models or null if not cached/expired
     */
    getCachedModels(provider: string): ModelDiscoveryResult | null;

    /**
     * Clear cache for a specific provider or all providers
     * @param provider - Optional provider ID (clears all if not specified)
     */
    clearCache(provider?: string): void;

    /**
     * Check if provider supports model listing API
     * @param provider - Provider ID
     * @returns boolean
     */
    supportsModelListing(provider: string): boolean;
}
