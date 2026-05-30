// Public API for settings feature
import { withErrorBoundary } from "@/features/shared/components";

import { SettingsDialog as SettingsDialogBase } from "./components/SettingsDialog";
export const SettingsDialog = withErrorBoundary(SettingsDialogBase, {
  name: "Settings",
});

export { AIConnectionsTab } from "./components/ai-connections-tab";
export { NewConnectionDialog } from "./components/new-connection-dialog";

// Hooks
export { useAIConnections } from "./hooks/useAIConnections";
