"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "@/core/storage/safe-storage";
import {
  AIConnection,
  AIProvider,
  connectionRequiresApiKey,
  connectionHasApiKey,
  isConnectionUsable,
} from "@/lib/config/ai-vendors";
import { deleteAPIKey, storeAPIKey } from "@/core/storage/api-keys";
import { logger } from "@/shared/utils/logger";
import { AI_CONNECTIONS_UPDATED_EVENT } from "@/hooks/use-has-ai-connection";

const log = logger.scope("useAIConnections");
const STORAGE_KEY = "ai_connections";

export type AIConnectionStatus = "active" | "disabled" | "missing-api-key";

function toStoredConnection(connection: AIConnection): AIConnection {
  return {
    ...connection,
    apiKey: "",
    hasApiKey: connection.hasApiKey === true,
  };
}

function notifyAIConnectionsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AI_CONNECTIONS_UPDATED_EVENT));
  }
}

function persistConnections(connections: AIConnection[], emitEvent = true) {
  storage.setItem(
    STORAGE_KEY,
    connections.map((connection) => toStoredConnection(connection)),
  );

  if (emitEvent) {
    notifyAIConnectionsUpdated();
  }
}

/**
 * Hook for managing AI connections state.
 * Handles CRUD operations and keeps `hasApiKey` metadata aligned with secure storage writes.
 */
export function useAIConnections() {
  const [connections, setConnections] = useState<AIConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const parsed = storage.getItem<AIConnection[]>(STORAGE_KEY, []);
    const hydrated = parsed.map((connection) => ({
      ...connection,
      apiKey: "",
      hasApiKey: connection.hasApiKey === true,
    }));

    if (hydrated.length === 0) {
      setConnections([]);
      setSelectedId("");
      return;
    }

    // Persist sanitized records to prevent accidental plaintext key storage.
    persistConnections(hydrated, false);
    setConnections(hydrated);
    setSelectedId(hydrated[0]?.id || "");
  }, []);

  const persistApiKey = useCallback(
    async (provider: AIProvider, connectionId: string, key: string) => {
      const normalized = key.trim();
      if (!normalized) {
        await deleteAPIKey(provider, connectionId);
        return;
      }
      await storeAPIKey(provider, connectionId, normalized);
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
                ...(nextApiKey !== undefined ? { apiKey: nextApiKey } : {}),
                updatedAt: Date.now(),
              }
            : c,
        );
        persistConnections(updated, nextApiKey === undefined);
        return updated;
      });

      if (nextApiKey !== undefined) {
        void persistApiKey(provider, id, nextApiKey)
          .then(() => {
            setConnections((prev) => {
              const committed = prev.map((connection) =>
                connection.id === id
                  ? {
                      ...connection,
                      hasApiKey: Boolean(nextApiKey.trim()),
                      updatedAt: Date.now(),
                    }
                  : connection,
              );
              persistConnections(committed);
              return committed;
            });
          })
          .catch((err) => {
            log.error("Failed to persist API key in local storage:", err);
            setError("Failed to persist API key in secure storage");
            setConnections((prev) => {
              const reverted = prev.map((connection) =>
                connection.id === id
                  ? {
                      ...connection,
                      apiKey: existing.apiKey,
                      hasApiKey: existing.hasApiKey === true,
                      updatedAt: Date.now(),
                    }
                  : connection,
              );
              persistConnections(reverted);
              return reverted;
            });
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
      hasApiKey: false,
      id: `${connection.provider}-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...connections, newConnection];
    setConnections(updated);
    persistConnections(updated, !newConnection.apiKey.trim());
    if (newConnection.apiKey.trim()) {
      void persistApiKey(
        newConnection.provider,
        newConnection.id,
        newConnection.apiKey,
      )
        .then(() => {
          setConnections((prev) => {
            const committed = prev.map((entry) =>
              entry.id === newConnection.id
                ? { ...entry, hasApiKey: true, updatedAt: Date.now() }
                : entry,
            );
            persistConnections(committed);
            return committed;
          });
        })
        .catch((err) => {
          log.error("Failed to store API key in local storage:", err);
          setError("Failed to store API key in secure storage");
          setConnections((prev) => {
            const downgraded = prev.map((entry) =>
              entry.id === newConnection.id
                ? {
                    ...entry,
                    apiKey: "",
                    hasApiKey: false,
                    updatedAt: Date.now(),
                  }
                : entry,
            );
            persistConnections(downgraded);
            return downgraded;
          });
        });
    }
    setSelectedId(newConnection.id);
  };

  const deleteConnection = (id: string) => {
    const removedConnection = connections.find((c) => c.id === id);
    const updated = connections.filter((c) => c.id !== id);
    setConnections(updated);
    persistConnections(updated);

    if (removedConnection) {
      void deleteAPIKey(removedConnection.provider, removedConnection.id).catch(
        (err) => {
          log.error("Failed to delete API key from local storage:", err);
        },
      );
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

  const selectedConnection = connections.find((c) => c.id === selectedId);
  const connectionStatusById = useMemo(() => {
    const next: Record<string, AIConnectionStatus> = {};
    connections.forEach((connection) => {
      if (!connection.enabled) {
        next[connection.id] = "disabled";
        return;
      }

      if (
        connectionRequiresApiKey(connection) &&
        !connectionHasApiKey(connection)
      ) {
        next[connection.id] = "missing-api-key";
        return;
      }

      next[connection.id] = isConnectionUsable(connection)
        ? "active"
        : "missing-api-key";
    });
    return next;
  }, [connections]);

  return {
    connections,
    selectedId,
    setSelectedId,
    selectedConnection,
    saveConnection,
    addConnection,
    deleteConnection,
    toggleEnabled,
    connectionStatusById,
    error,
  };
}
