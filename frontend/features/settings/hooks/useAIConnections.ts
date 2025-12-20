'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/core/storage/safe-storage';
import { AIConnection } from '@/lib/config/ai-vendors';

/**
 * Hook for managing AI connections state.
 * Handles CRUD operations and localStorage persistence.
 */
export function useAIConnections() {
    const [connections, setConnections] = useState<AIConnection[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');

    const initializeDefaultConnection = () => {
        const defaultConnection: AIConnection = {
            id: 'google-default',
            name: 'Google Gemini',
            provider: 'google',
            apiKey: '',
            enabled: true,
            models: ['gemini-flash-latest'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const newConnections = [defaultConnection];
        setConnections(newConnections);
        setSelectedId(defaultConnection.id);
        storage.setItem('ai_connections', newConnections);
    };

    useEffect(() => {
        const loadConnections = () => {
            const parsed = storage.getItem<AIConnection[]>('ai_connections', []);

            if (parsed.length > 0) {
                setConnections(parsed);
                if (!selectedId && parsed[0]) {
                    setSelectedId(parsed[0].id);
                }
            } else {
                initializeDefaultConnection();
            }
        };

        loadConnections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveConnection = (
        id: string,
        updates: {
            name?: string;
            apiKey?: string;
            customEndpoint?: string;
            models?: string[];
        }
    ) => {
        const updated = connections.map((c) =>
            c.id === id
                ? {
                    ...c,
                    ...updates,
                    updatedAt: Date.now(),
                }
                : c
        );
        setConnections(updated);
        storage.setItem('ai_connections', updated);

        // Legacy support for old OpenRouter key
        const selected = connections.find((c) => c.id === id);
        if (selected?.provider === 'openrouter' && updates.apiKey) {
            storage.setItem('openrouter_api_key', updates.apiKey);
        }
    };

    const addConnection = (connection: Omit<AIConnection, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newConnection: AIConnection = {
            ...connection,
            id: `${connection.provider}-${Date.now()}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const updated = [...connections, newConnection];
        setConnections(updated);
        storage.setItem('ai_connections', updated);
        setSelectedId(newConnection.id);
    };

    const deleteConnection = (id: string) => {
        const updated = connections.filter((c) => c.id !== id);
        setConnections(updated);
        storage.setItem('ai_connections', updated);
        setSelectedId(updated[0]?.id || '');
    };

    const toggleEnabled = (id: string) => {
        const updated = connections.map((c) =>
            c.id === id ? { ...c, enabled: !c.enabled, updatedAt: Date.now() } : c
        );
        setConnections(updated);
        storage.setItem('ai_connections', updated);
    };

    const selectedConnection = connections.find((c) => c.id === selectedId);

    return {
        connections,
        selectedId,
        setSelectedId,
        selectedConnection,
        saveConnection,
        addConnection,
        deleteConnection,
        toggleEnabled,
    };
}
