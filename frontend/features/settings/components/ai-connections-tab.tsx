"use client";

import { useState } from "react";
import { useConfirmation } from "@/hooks/use-confirmation";
import { AI_VENDORS } from "@/lib/config/ai-vendors";
import { logger } from "@/shared/utils/logger";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIConnections } from "../hooks/useAIConnections";
import { useConnectionValidation } from "../hooks/useConnectionValidation";
import { ConnectionForm } from "./ai-connections/ConnectionForm";
import { ConnectionList } from "./ai-connections/ConnectionList";
import { NewConnectionDialog } from "./new-connection-dialog";

const log = logger.scope("AIConnectionsTab");

export function AIConnectionsTab() {
  const [showNewDialog, setShowNewDialog] = useState(false);
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
  } = useAIConnections();

  const { loading, error, refreshModels } = useConnectionValidation();

  const handleRefreshModels = async () => {
    if (!selectedConnection) return;

    try {
      const fetchedModels = await refreshModels(
        selectedConnection,
        selectedConnection.apiKey,
        selectedConnection.customEndpoint,
      );

      await saveConnection(selectedId, {
        models: fetchedModels,
        apiKey: selectedConnection.apiKey,
        ...(selectedConnection.customEndpoint && {
          customEndpoint: selectedConnection.customEndpoint,
        }),
      });
    } catch (err) {
      log.error("Failed to refresh models:", err);
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
                loading={loading}
                error={error}
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
              API keys are saved in your operating system keychain. Connection
              metadata stays local to this machine and is not uploaded to
              servers.
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
