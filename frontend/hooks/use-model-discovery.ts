/**
 * useModelDiscovery Hook
 *
 * React hook for fetching and managing AI models from providers.
 * Uses ModelDiscoveryService for the actual API calls.
 *
 * @see CODING_GUIDELINES.md - 8-Layer Architecture, Layer 2 (Hook)
 */

import { useState, useCallback, useEffect } from 'react';
import { modelDiscoveryService } from '@/infrastructure/services/ModelDiscoveryService';
import type { AIModel, ModelDiscoveryResult } from '@/domain/services/IModelDiscoveryService';
import type { AIConnection } from '@/lib/config/ai-vendors';
import { storage } from '@/core/storage/safe-storage';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('useModelDiscovery');

interface UseModelDiscoveryOptions {
    /** Auto-fetch models on mount */
    autoFetch?: boolean;
    /** Fetch models for all enabled connections */
    fetchAll?: boolean;
}

interface UseModelDiscoveryReturn {
    /** All available models grouped by provider */
    models: AIModel[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Fetch models for a specific connection */
    fetchModelsForConnection: (connection: AIConnection) => Promise<ModelDiscoveryResult>;
    /** Fetch models for all enabled connections */
    fetchAllModels: () => Promise<void>;
    /** Refresh models (clear cache and re-fetch) */
    refreshModels: () => Promise<void>;
}

/**
 * Hook for discovering available AI models from configured connections
 */
export function useModelDiscovery(
    options: UseModelDiscoveryOptions = {}
): UseModelDiscoveryReturn {
    const { autoFetch = true, fetchAll = true } = options;

    const [models, setModels] = useState<AIModel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch models for a single connection
     */
    const fetchModelsForConnection = useCallback(
        async (connection: AIConnection): Promise<ModelDiscoveryResult> => {
            if (!connection.enabled || !connection.apiKey) {
                return { models: [], error: 'Connection not enabled or missing API key' };
            }

            log.debug(`Fetching models for ${connection.provider}...`);

            const result = await modelDiscoveryService.fetchModels(
                connection.provider,
                connection.apiKey,
                connection.customEndpoint
            );

            return result;
        },
        []
    );

    /**
     * Fetch models for all enabled connections
     */
    const fetchAllModels = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Get all enabled connections
            const connections = storage.getItem<AIConnection[]>('ai_connections', []);
            const enabledConnections = connections.filter((c) => c.enabled && c.apiKey);

            if (enabledConnections.length === 0) {
                setModels([]);
                return;
            }

            // Fetch models from all connections in parallel
            const results = await Promise.allSettled(
                enabledConnections.map((conn) => fetchModelsForConnection(conn))
            );

            // Combine all models
            const allModels: AIModel[] = [];
            const errors: string[] = [];

            results.forEach((result, index) => {
                const connection = enabledConnections[index];
                if (!connection) return;

                if (result.status === 'fulfilled') {
                    const { value } = result;
                    if (value.error) {
                        errors.push(`${connection.provider}: ${value.error}`);
                    } else {
                        allModels.push(...value.models);
                    }
                } else {
                    errors.push(`${connection.provider}: ${String(result.reason)}`);
                }
            });

            setModels(allModels);

            if (errors.length > 0) {
                log.warn('Some model fetches failed:', errors);
                setError(errors.join('; '));
            }

            log.info(`Loaded ${allModels.length} models from ${enabledConnections.length} providers`);
        } catch (err) {
            log.error('Failed to fetch models:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch models');
        } finally {
            setIsLoading(false);
        }
    }, [fetchModelsForConnection]);

    /**
     * Clear cache and re-fetch all models
     */
    const refreshModels = useCallback(async () => {
        log.info('Refreshing models (clearing cache)...');
        modelDiscoveryService.clearCache();
        await fetchAllModels();
    }, [fetchAllModels]);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch && fetchAll) {
            fetchAllModels();
        }
    }, [autoFetch, fetchAll, fetchAllModels]);

    return {
        models,
        isLoading,
        error,
        fetchModelsForConnection,
        fetchAllModels,
        refreshModels,
    };
}
