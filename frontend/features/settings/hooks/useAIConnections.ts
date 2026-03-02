"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AI_CONNECTIONS_UPDATED_EVENT,
  deleteAIConnection,
  listAIConnections,
  notifyAIConnectionsUpdated,
  saveAIConnection,
  toAIConnection,
  type SaveAIConnectionInput,
} from "@/core/state/app-state";
import {
  AIConnection,
  connectionRequiresApiKey,
} from "@/lib/config/ai-vendors";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("useAIConnections");

export type AIConnectionStatus = "active" | "disabled" | "missing-api-key";

/**
 * Hook for managing AI connections state from SQLite-backed commands.
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
      try {
        const persisted = await listAIConnections();
        if (cancelled) {
          return;
        }

        const hydrated = persisted.map(toAIConnection);
        const keyPresence = Object.fromEntries(
          persisted.map((connection) => [
            connection.id,
            connection.hasStoredApiKey,
          ]),
        );

        setConnections(hydrated);
        setHasStoredApiKeyById(keyPresence);
        setSelectedId((current) => {
          if (current && hydrated.some((conn) => conn.id === current)) {
            return current;
          }
          return hydrated[0]?.id ?? "";
        });
      } catch (initError) {
        log.error("Failed to initialize AI connections:", initError);
        if (!cancelled) {
          setError("Failed to load AI connections from app state");
        }
      }
    };

    void initializeConnections();

    const handleExternalRefresh = () => {
      void initializeConnections();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        AI_CONNECTIONS_UPDATED_EVENT,
        handleExternalRefresh,
      );
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(
          AI_CONNECTIONS_UPDATED_EVENT,
          handleExternalRefresh,
        );
      }
    };
  }, []);

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

      try {
        const saveInput: SaveAIConnectionInput = {
          id,
          name: updates.name ?? existing.name,
          provider: existing.provider,
          enabled: existing.enabled,
          models: updates.models ?? existing.models ?? [],
          ...(updates.apiKey !== undefined ? { apiKey: updates.apiKey } : {}),
        };
        const resolvedEndpoint =
          updates.customEndpoint !== undefined
            ? updates.customEndpoint
            : existing.customEndpoint;
        if (resolvedEndpoint) {
          saveInput.customEndpoint = resolvedEndpoint;
        }
        const saved = await saveAIConnection(saveInput);

        setConnections((prev) =>
          prev.map((connection) =>
            connection.id === id ? toAIConnection(saved) : connection,
          ),
        );
        setHasStoredApiKeyById((prev) => ({
          ...prev,
          [id]: saved.hasStoredApiKey,
        }));
        notifyAIConnectionsUpdated();
      } catch (saveError) {
        log.error("Failed to save AI connection:", saveError);
        setError("Failed to persist AI connection in SQLite");
        throw saveError;
      }
    },
    [connections],
  );

  const addConnection = useCallback(
    async (
      connection: Omit<AIConnection, "id" | "createdAt" | "updatedAt">,
    ) => {
      setError("");
      const newId = `${connection.provider}-${Date.now()}`;

      try {
        const saveInput: SaveAIConnectionInput = {
          id: newId,
          name: connection.name,
          provider: connection.provider,
          enabled: connection.enabled,
          models: connection.models ?? [],
          ...(connection.apiKey.trim().length > 0
            ? { apiKey: connection.apiKey }
            : {}),
        };
        if (connection.customEndpoint) {
          saveInput.customEndpoint = connection.customEndpoint;
        }
        const saved = await saveAIConnection(saveInput);

        setConnections((prev) => [...prev, toAIConnection(saved)]);
        setHasStoredApiKeyById((prev) => ({
          ...prev,
          [saved.id]: saved.hasStoredApiKey,
        }));
        setSelectedId(saved.id);
        notifyAIConnectionsUpdated();
      } catch (addError) {
        log.error("Failed to add AI connection:", addError);
        setError("Failed to create AI connection");
        throw addError;
      }
    },
    [],
  );

  const removeConnection = useCallback(async (id: string) => {
    try {
      await deleteAIConnection(id);
    } catch (deleteError) {
      log.error("Failed to delete AI connection:", deleteError);
      setError("Failed to delete AI connection");
      throw deleteError;
    }

    setConnections((prev) => {
      const updated = prev.filter((connection) => connection.id !== id);
      setSelectedId((current) => {
        if (current !== id) return current;
        return updated[0]?.id ?? "";
      });
      return updated;
    });

    setHasStoredApiKeyById((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    notifyAIConnectionsUpdated();
  }, []);

  const toggleEnabled = useCallback(
    async (id: string) => {
      const existing = connections.find((connection) => connection.id === id);
      if (!existing) return;

      try {
        const saveInput: SaveAIConnectionInput = {
          id: existing.id,
          name: existing.name,
          provider: existing.provider,
          enabled: !existing.enabled,
          models: existing.models ?? [],
        };
        if (existing.customEndpoint) {
          saveInput.customEndpoint = existing.customEndpoint;
        }
        const saved = await saveAIConnection(saveInput);

        setConnections((prev) =>
          prev.map((connection) =>
            connection.id === id ? toAIConnection(saved) : connection,
          ),
        );
        setHasStoredApiKeyById((prev) => ({
          ...prev,
          [id]: saved.hasStoredApiKey,
        }));
        notifyAIConnectionsUpdated();
      } catch (toggleError) {
        log.error("Failed to toggle AI connection:", toggleError);
        setError("Failed to update AI connection status");
        throw toggleError;
      }
    },
    [connections],
  );

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
    deleteConnection: removeConnection,
    toggleEnabled,
    connectionStatusById,
    error,
  };
}
