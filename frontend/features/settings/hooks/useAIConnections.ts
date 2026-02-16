"use client";

import { useState, useEffect, useCallback } from "react";
import { storage } from "@/core/storage/safe-storage";
import { AIConnection, AIProvider, AI_VENDORS } from "@/lib/config/ai-vendors";
import { modelDiscoveryService } from "@/infrastructure/services/ModelDiscoveryService";
import { deleteAPIKey, getAPIKey, storeAPIKey } from "@/core/storage/api-keys";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("useAIConnections");
const STORAGE_KEY = "ai_connections";

function toStoredConnection(connection: AIConnection): AIConnection {
  return { ...connection, apiKey: "" };
}

function persistConnections(connections: AIConnection[]) {
  storage.setItem(
    STORAGE_KEY,
    connections.map((connection) => toStoredConnection(connection)),
  );
}

function requiresApiKey(connection: AIConnection): boolean {
  if (connection.provider !== "openai") {
    return AI_VENDORS[connection.provider].requiresAuth;
  }

  const normalizedEndpoint =
    connection.customEndpoint?.trim() || AI_VENDORS.openai.defaultEndpoint;
  return normalizedEndpoint === AI_VENDORS.openai.defaultEndpoint;
}

/**
 * Hook for managing AI connections state.
 * Handles CRUD operations and stores API keys in OS keychain.
 */
export function useAIConnections() {
  const [connections, setConnections] = useState<AIConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const loadConnections = async () => {
      const parsed = storage.getItem<AIConnection[]>(STORAGE_KEY, []);
      if (parsed.length === 0) {
        if (!cancelled) {
          setConnections([]);
          setSelectedId("");
        }
        return;
      }
      // Ensure local storage never keeps plaintext API keys.
      persistConnections(parsed);

      const hydrated = await Promise.all(
        parsed.map(async (connection) => {
          if (connection.apiKey?.trim()) return connection;
          const storedKey = await getAPIKey(connection.provider);
          if (!storedKey) return connection;
          return { ...connection, apiKey: storedKey };
        }),
      );

      if (!cancelled) {
        setConnections(hydrated);
        setSelectedId(hydrated[0]?.id || "");
      }
    };

    void loadConnections();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistApiKey = useCallback(
    async (provider: AIProvider, key: string) => {
      const normalized = key.trim();
      if (!normalized) {
        await deleteAPIKey(provider);
        return;
      }
      await storeAPIKey(provider, normalized);
    },
    [],
  );

  const saveConnection = useCallback(
    (
      id: string,
      updates: {
        name?: string;
        apiKey?: string;
        customEndpoint?: string;
        models?: string[];
      },
    ) => {
      const existing = connections.find((connection) => connection.id === id);
      if (!existing) return;
      const provider = existing.provider;
      const nextApiKey = updates.apiKey;

      setConnections((prev) => {
        const updated = prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...updates,
                updatedAt: Date.now(),
              }
            : c,
        );
        persistConnections(updated);
        return updated;
      });

      if (nextApiKey !== undefined) {
        void persistApiKey(provider, nextApiKey).catch((err) => {
          log.error("Failed to persist API key in keychain:", err);
          setError("Failed to persist API key in secure storage");
        });
      }
    },
    [connections, persistApiKey],
  );

  const addConnection = (
    connection: Omit<AIConnection, "id" | "createdAt" | "updatedAt">,
  ) => {
    const newConnection: AIConnection = {
      ...connection,
      id: `${connection.provider}-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...connections, newConnection];
    setConnections(updated);
    persistConnections(updated);
    if (newConnection.apiKey.trim()) {
      void persistApiKey(newConnection.provider, newConnection.apiKey).catch(
        (err) => {
          log.error("Failed to store API key in keychain:", err);
          setError("Failed to store API key in secure storage");
        },
      );
    }
    setSelectedId(newConnection.id);
  };

  const deleteConnection = (id: string) => {
    const removedConnection = connections.find((c) => c.id === id);
    const updated = connections.filter((c) => c.id !== id);
    setConnections(updated);
    persistConnections(updated);

    if (
      removedConnection &&
      !updated.some((c) => c.provider === removedConnection.provider)
    ) {
      void deleteAPIKey(removedConnection.provider).catch((err) => {
        log.error("Failed to delete API key from keychain:", err);
      });
    }

    setSelectedId(updated[0]?.id || "");
  };

  const toggleEnabled = (id: string) => {
    const updated = connections.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled, updatedAt: Date.now() } : c,
    );
    setConnections(updated);
    persistConnections(updated);
  };

  /**
   * Fetch available models from the provider API
   */
  const refreshModels = useCallback(
    async (id: string) => {
      const connection = connections.find((c) => c.id === id);
      if (!connection) return;

      setLoading(true);
      setError("");

      try {
        const keyFromStorage = connection.apiKey || "";
        const keyFromKeychain =
          keyFromStorage.trim() || (await getAPIKey(connection.provider)) || "";
        const canFetchWithoutKey = !requiresApiKey(connection);
        if (!keyFromKeychain && !canFetchWithoutKey) {
          setError("API key is required to fetch models");
          return;
        }

        if (keyFromKeychain && keyFromStorage !== keyFromKeychain) {
          saveConnection(id, { apiKey: keyFromKeychain });
        }

        log.info(`Fetching models for ${connection.provider}...`);

        const result = await modelDiscoveryService.fetchModels(
          connection.provider,
          keyFromKeychain,
          connection.customEndpoint,
        );

        if (result.error) {
          setError(result.error);
          log.warn(`Model fetch error: ${result.error}`);
        } else {
          // Update connection with fetched models
          const modelIds = result.models.map((m) => m.id);
          saveConnection(id, { models: modelIds });
          log.info(
            `Found ${modelIds.length} models for ${connection.provider}`,
          );
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch models";
        setError(errorMsg);
        log.error("Failed to fetch models:", err);
      } finally {
        setLoading(false);
      }
    },
    [connections, saveConnection],
  );

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
    refreshModels,
    loading,
    error,
  };
}
