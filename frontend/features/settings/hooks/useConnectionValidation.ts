'use client';

import { useState } from 'react';
import { AIConnection } from '@/lib/config/ai-vendors';
import { fetchModelsForConnection } from '@/lib/core/ai-client';

/**
 * Hook for validating AI connections and fetching models.
 * Handles loading and error states.
 */
export function useConnectionValidation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const refreshModels = async (
        connection: AIConnection,
        apiKey: string,
        customEndpoint?: string
    ): Promise<string[]> => {
        if (!apiKey) {
            setError('Please enter an API key first');
            throw new Error('API key is required');
        }

        setLoading(true);
        setError('');

        try {
            const connectionData: AIConnection = {
                ...connection,
                apiKey,
            };

            if (customEndpoint) {
                connectionData.customEndpoint = customEndpoint;
            }

            const fetchedModels = await fetchModelsForConnection(connectionData);

            setLoading(false);
            return fetchedModels;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch models';
            setError(errorMessage);
            setLoading(false);
            throw err;
        }
    };

    return {
        loading,
        error,
        refreshModels,
    };
}
