"use client";

import { useState, useEffect, useCallback } from "react";
import { storage } from "@/core/storage/safe-storage";
import { AIConnection } from "@/lib/config/ai-vendors";
import { modelDiscoveryService } from "@/infrastructure/services/ModelDiscoveryService";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("useAIConnections");

/**
 * Hook for managing AI connections state.
 * Handles CRUD operations and localStorage persistence.
 */
export function useAIConnections() {
  const [connections, setConnections] = useState<AIConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadConnections = () => {
      const parsed = storage.getItem<AIConnection[]>("ai_connections", []);

      if (parsed.length > 0) {
        setConnections(parsed);
        setSelectedId(parsed[0]?.id || "");
      } else {
        setConnections([]);
        setSelectedId("");
      }
    };

    loadConnections();
  }, []);

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
        storage.setItem("ai_connections", updated);
        return updated;
      });
    },
    [],
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
    storage.setItem("ai_connections", updated);
    setSelectedId(newConnection.id);
  };

  const deleteConnection = (id: string) => {
    const updated = connections.filter((c) => c.id !== id);
    setConnections(updated);
    storage.setItem("ai_connections", updated);
    setSelectedId(updated[0]?.id || "");
  };

  const toggleEnabled = (id: string) => {
    const updated = connections.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled, updatedAt: Date.now() } : c,
    );
    setConnections(updated);
    storage.setItem("ai_connections", updated);
  };

  /**
   * Fetch available models from the provider API
   */
  const refreshModels = useCallback(
    async (id: string) => {
      const connection = connections.find((c) => c.id === id);
      if (!connection) return;

      if (!connection.apiKey) {
        setError("API key is required to fetch models");
        return;
      }

      setLoading(true);
      setError("");

      try {
        log.info(`Fetching models for ${connection.provider}...`);

        const result = await modelDiscoveryService.fetchModels(
          connection.provider,
          connection.apiKey,
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
