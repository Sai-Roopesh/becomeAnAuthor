// Public API for data-management feature
import { withErrorBoundary } from "@/features/shared/components";

import {
  BackupCenterDialog as BackupCenterDialogBase,
  type BackupCenterDialogProps,
} from "./components/BackupCenterDialog";
export const BackupCenterDialog = withErrorBoundary<BackupCenterDialogProps>(
  BackupCenterDialogBase,
  {
    name: "Backup Center",
  },
);

import { BackupCenterPanel as BackupCenterPanelBase } from "./components/BackupCenterPanel";
import type { BackupCenterPanelProps } from "./components/BackupCenterPanel";
export const BackupCenterPanel = withErrorBoundary<BackupCenterPanelProps>(
  BackupCenterPanelBase,
  {
    name: "Backup Center Panel",
  },
);
