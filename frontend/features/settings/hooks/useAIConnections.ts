"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "@/core/storage/safe-storage";
import {
  AIConnection,
  AIProvider,
  connectionRequiresApiKey,
} from "@/lib/config/ai-vendors";
import {
  deleteAPIKey,
  isApiKeyStored,
  storeAPIKey,
} from "@/core/storage/api-keys";
import { logger } from "@/shared/utils/logger";
import { AI_CONNECTIONS_UPDATED_EVENT } from "@/hooks/use-has-ai-connection";

const log = logger.scope("useAIConnections");
const STORAGE_KEY = "ai_connections";

export type AIConnectionStatus = "active" | "disabled" | "missing-api-key";

function toStoredConnection(connection: AIConnection): AIConnection {
  return {
    id: connection.id,
    name: connection.name,
    provider: connection.provider,
    apiKey: "",
    ...(connection.customEndpoint
      ? { customEndpoint: connection.customEndpoint }
      : {}),
    enabled: connection.enabled,
    ...(connection.models ? { models: connection.models } : {}),
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
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
 * Handles CRUD operations and keeps API key presence derived from secure storage.
 */
export function useAIConnections() {
  const [connections, setConnections] = useState<AIConnection[]>([]);
  const [hasStoredApiKeyById, setHasStoredApiKeyById] = useState<
    Record<string, boolean>
  >({});
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const initializeConnections = async () => {
      const parsed = storage.getItem<AIConnection[]>(STORAGE_KEY, []);
      const hydrated = parsed.map((connection) =>
        toStoredConnection(connection),
      );

      if (hydrated.length === 0) {
        if (!cancelled) {
          setConnections([]);
          setHasStoredApiKeyById({});
          setSelectedId("");
        }
        return;
      }

      // Persist sanitized records to prevent accidental plaintext key storage.
      persistConnections(hydrated, false);

      if (!cancelled) {
        setConnections(hydrated);
        setSelectedId(hydrated[0]?.id ?? "");
      }

      try {
        const storedKeyPresence = await Promise.all(
          hydrated.map(async (connection) => {
            if (!connectionRequiresApiKey(connection)) {
              return [connection.id, false] as const;
            }

            const present = await isApiKeyStored(
              connection.provider,
              connection.id,
            );
            return [connection.id, present] as const;
          }),
        );

        if (cancelled) {
          return;
        }

        setHasStoredApiKeyById(Object.fromEntries(storedKeyPresence));
      } catch (keyCheckError) {
        log.error(
          "Failed to initialize secure API key presence:",
          keyCheckError,
        );
        if (!cancelled) {
          setError("Failed to read API key presence from secure storage");
        }
      }
    };

    void initializeConnections();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistApiKey = useCallback(
    async (provider: AIProvider, connectionId: string, key: string) => {
      const normalized = key.trim();
      const expectsStoredKey = normalized.length > 0;

      if (!expectsStoredKey) {
        await deleteAPIKey(provider, connectionId);
      } else {
        await storeAPIKey(provider, connectionId, normalized);
      }

      const keyPresent = await isApiKeyStored(provider, connectionId);
      if (keyPresent !== expectsStoredKey) {
        throw new Error(
          expectsStoredKey
            ? "API key save could not be verified in secure storage"
            : "API key deletion could not be verified in secure storage",
        );
      }

      return keyPresent;
    },
    [],
  );

  const saveConnection = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        apiKey?: string;
        customEndpoint?: string;
        models?: string[];
      },
    ) => {
      setError("");
      const existing = connections.find((connection) => connection.id === id);
      if (!existing) return;
      const provider = existing.provider;
      const nextApiKey = updates.apiKey;

      let resolvedKeyPresence = hasStoredApiKeyById[id] === true;

      if (nextApiKey !== undefined) {
        try {
          resolvedKeyPresence = await persistApiKey(provider, id, nextApiKey);
        } catch (err) {
          log.error("Failed to persist API key in secure storage:", err);
          setError("Failed to persist API key in secure storage");
          throw err;
        }
      } else if (updates.customEndpoint !== undefined) {
        const nextConnection = {
          ...existing,
          ...updates,
        } as AIConnection;
        if (connectionRequiresApiKey(nextConnection)) {
          try {
            resolvedKeyPresence = await isApiKeyStored(provider, id);
          } catch (keyCheckError) {
            log.error(
              "Failed to refresh API key presence after endpoint update",
              {
                connectionId: id,
                provider,
                error: keyCheckError,
              },
            );
            setError("Failed to refresh API key presence from secure storage");
            throw keyCheckError;
          }
        } else {
          resolvedKeyPresence = false;
        }
      }

      const updated = connections.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updates,
              ...(nextApiKey !== undefined ? { apiKey: "" } : {}),
              updatedAt: Date.now(),
            }
          : c,
      );

      setConnections(updated);
      persistConnections(updated);

      if (nextApiKey !== undefined || updates.customEndpoint !== undefined) {
        setHasStoredApiKeyById((prev) => ({
          ...prev,
          [id]: resolvedKeyPresence,
        }));
      }
    },
    [connections, hasStoredApiKeyById, persistApiKey],
  );

  const addConnection = useCallback(
    async (
      connection: Omit<AIConnection, "id" | "createdAt" | "updatedAt">,
    ) => {
      setError("");
      const newConnection: AIConnection = {
        ...connection,
        id: `${connection.provider}-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      let keyPresent = false;
      if (newConnection.apiKey.trim()) {
        try {
          keyPresent = await persistApiKey(
            newConnection.provider,
            newConnection.id,
            newConnection.apiKey,
          );
        } catch (err) {
          log.error("Failed to store API key in secure storage:", err);
          setError("Failed to store API key in secure storage");
          throw err;
        }
      }

      const sanitizedConnection: AIConnection = {
        ...newConnection,
        apiKey: "",
      };

      const updated = [...connections, sanitizedConnection];
      setConnections(updated);
      setHasStoredApiKeyById((prev) => ({
        ...prev,
        [newConnection.id]: keyPresent,
      }));
      persistConnections(updated);
      setSelectedId(newConnection.id);
    },
    [connections, persistApiKey],
  );

  const deleteConnection = (id: string) => {
    const removedConnection = connections.find((c) => c.id === id);
    const updated = connections.filter((c) => c.id !== id);
    setConnections(updated);
    setHasStoredApiKeyById((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    persistConnections(updated);

    if (removedConnection) {
      void deleteAPIKey(removedConnection.provider, removedConnection.id).catch(
        (err) => {
          log.error("Failed to delete API key from secure storage:", err);
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
        !hasStoredApiKeyById[connection.id]
      ) {
        next[connection.id] = "missing-api-key";
        return;
      }

      next[connection.id] = "active";
    });
    return next;
  }, [connections, hasStoredApiKeyById]);

  return {
    connections,
    hasStoredApiKeyById,
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
