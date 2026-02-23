"use client";

import { useState } from "react";
import { useConfirmation } from "@/hooks/use-confirmation";
import { AI_VENDORS, connectionRequiresApiKey } from "@/lib/config/ai-vendors";
import { logger } from "@/shared/utils/logger";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIConnections } from "../hooks/useAIConnections";
import { ConnectionForm } from "./ai-connections/ConnectionForm";
import { ConnectionList } from "./ai-connections/ConnectionList";
import { NewConnectionDialog } from "./new-connection-dialog";
import { modelDiscoveryService } from "@/infrastructure/services/ModelDiscoveryService";
import { getAPIKey } from "@/core/storage/api-keys";

const log = logger.scope("AIConnectionsTab");

export function AIConnectionsTab() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [modelRefreshError, setModelRefreshError] = useState("");
  const { confirm, ConfirmationDialog } = useConfirmation();

  const {
    connections,
    selectedId,
    setSelectedId,
    selectedConnection,
    saveConnection,
    addConnection,
    deleteConnection,
    toggleEnabled,
    connectionStatusById,
    error: connectionError,
  } = useAIConnections();

  const handleRefreshModels = async () => {
    if (!selectedId || !selectedConnection) return;

    setIsRefreshingModels(true);
    setModelRefreshError("");

    try {
      const storedApiKey = selectedConnection.apiKey.trim();
      const secureApiKey =
        storedApiKey ||
        (await getAPIKey(selectedConnection.provider, selectedConnection.id)) ||
        "";

      if (!secureApiKey && connectionRequiresApiKey(selectedConnection)) {
        setModelRefreshError("API key is required to fetch models");
        return;
      }

      if (secureApiKey && secureApiKey !== selectedConnection.apiKey) {
        saveConnection(selectedId, { apiKey: secureApiKey });
      }

      const result = await modelDiscoveryService.fetchModels(
        selectedConnection.provider,
        secureApiKey,
        selectedConnection.customEndpoint,
      );
      if (result.error) {
        setModelRefreshError(result.error);
        return;
      }

      saveConnection(selectedId, {
        models: result.models.map((model) => model.id),
      });
    } catch (err) {
      log.error("Failed to refresh models:", err);
      setModelRefreshError(
        err instanceof Error ? err.message : "Failed to refresh models",
      );
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handleDelete = async () => {
    if (connections.length === 1) {
      return;
    }

    const confirmed = await confirm({
      title: "Delete Connection",
      description:
        "Are you sure you want to delete this connection? This action cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteConnection(selectedId);
    }
  };

  const handleSave = (updates: {
    name?: string;
    apiKey?: string;
    customEndpoint?: string;
    models?: string[];
  }) => {
    saveConnection(selectedId, updates);
  };

  const vendor = selectedConnection
    ? AI_VENDORS[selectedConnection.provider]
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="min-w-0 space-y-5 p-4 sm:space-y-6 sm:p-6">
          <section className="rounded-xl border bg-muted/20 p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Connected AI Vendors
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add and prioritize the providers this device can use. The first
              active provider that supports a requested model will be selected
              by default.
            </p>
          </section>

          <section className="grid min-w-0 items-start gap-4 2xl:grid-cols-[18rem_minmax(0,1fr)]">
            <ConnectionList
              connections={connections}
              connectionStatusById={connectionStatusById}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddNew={() => setShowNewDialog(true)}
            />

            {selectedConnection && vendor ? (
              <ConnectionForm
                connection={selectedConnection}
                vendor={vendor}
                onSave={handleSave}
                onToggleEnabled={() => toggleEnabled(selectedId)}
                onDelete={handleDelete}
                onRefreshModels={handleRefreshModels}
                loading={isRefreshingModels}
                error={modelRefreshError || connectionError}
              />
            ) : (
              <div className="min-w-0 rounded-xl border p-6 text-center">
                <p className="font-medium">No connection selected</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a connection from the left column to configure model
                  access.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-muted/20 p-4 sm:p-5">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Credentials Storage
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              API keys and connection metadata are saved locally on this device
              and are not uploaded to external servers.
            </p>
          </section>
        </div>
      </ScrollArea>

      <NewConnectionDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSave={addConnection}
      />

      <ConfirmationDialog />
    </div>
  );
}
