"use client";

import { useState } from "react";
import { AI_VENDORS } from "@/lib/config/ai-vendors";
import { NewConnectionDialog } from "./new-connection-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useAIConnections } from "../hooks/useAIConnections";
import { useConnectionValidation } from "../hooks/useConnectionValidation";
import { ConnectionList } from "./ai-connections/ConnectionList";
import { ConnectionForm } from "./ai-connections/ConnectionForm";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("AIConnectionsTab");

/**
 * AI Connections Tab - Refactored
 * Orchestrates connection management UI with extracted hooks and components.
 * Reduced from 377 lines to ~120 lines.
 */
export function AIConnectionsTab() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { confirm, ConfirmationDialog } = useConfirmation();

  // State management hook
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

  // Validation hook
  const { loading, error, refreshModels } = useConnectionValidation();

  // Handle model refresh
  const handleRefreshModels = async () => {
    if (!selectedConnection) return;

    try {
      const fetchedModels = await refreshModels(
        selectedConnection,
        selectedConnection.apiKey,
        selectedConnection.customEndpoint,
      );

      // Update connection with fetched models
      await saveConnection(selectedId, {
        models: fetchedModels,
        apiKey: selectedConnection.apiKey,
        ...(selectedConnection.customEndpoint && {
          customEndpoint: selectedConnection.customEndpoint,
        }),
      });
    } catch (err) {
      // Error already handled by hook
      log.error("Failed to refresh models:", err);
    }
  };

  // Handle connection delete with confirmation
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

  // Handle connection save
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-none p-6 pr-16 bg-background border-b">
        <h3 className="text-sm font-medium mb-2 uppercase tracking-wide text-muted-foreground">
          CONNECTED AI VENDORS
        </h3>
        <p className="text-sm text-muted-foreground">
          These are all your AI connections on this device. Add or edit
          connections in the right column. Organize the list on the left by
          priority, as the first entry that supports a specific model will be
          used.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 bg-background overflow-hidden">
        {/* Connection List */}
        <ConnectionList
          connections={connections}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddNew={() => setShowNewDialog(true)}
        />

        {/* Connection Form */}
        {selectedConnection && vendor && (
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
        )}
        {!selectedConnection && (
          <div className="flex-1 border rounded-md p-6 flex items-center justify-center text-center">
            <div>
              <p className="font-medium mb-1">No connection selected</p>
              <p className="text-sm text-muted-foreground">
                Add a new connection from the left panel to start using AI
                features.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-none p-6 border-t bg-background">
        <h4 className="text-sm font-medium mb-2 uppercase tracking-wide text-muted-foreground">
          CREDENTIALS ARE STORED PER MACHINE
        </h4>
        <p className="text-sm text-muted-foreground">
          Your settings are stored <strong>locally on this machine.</strong> You
          will need to enter credentials again on a different device. We do not
          store any credentials on our servers.
        </p>
      </div>

      {/* Dialogs */}
      <NewConnectionDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSave={addConnection}
      />

      <ConfirmationDialog />
    </div>
  );
}
