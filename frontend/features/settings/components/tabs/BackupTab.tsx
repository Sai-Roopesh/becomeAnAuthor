"use client";

import { BackupCenterPanel } from "@/features/data-management";

/**
 * Backup Tab
 *
 * Unified backup and restore functionality.
 */
export function BackupTab() {
  return (
    <div className="p-6 bg-background flex-1 overflow-y-auto min-h-0">
      <h3 className="text-lg font-semibold mb-2">Backup Center</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Manage local and Google Drive backups in one place, including restore.
      </p>
      <BackupCenterPanel />
    </div>
  );
}
