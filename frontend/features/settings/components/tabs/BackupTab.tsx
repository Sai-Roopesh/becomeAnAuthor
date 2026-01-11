"use client";

import { GoogleDriveConnection } from "../GoogleDriveConnection";

/**
 * Backup Tab
 *
 * Google Drive backup and restore functionality.
 */
export function BackupTab() {
  return (
    <div className="p-6 bg-background flex-1 overflow-y-auto min-h-0">
      <h3 className="text-lg font-semibold mb-2">Backup & Restore</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Securely back up your novels to Google Drive. Your data stays in your
        control.
      </p>
      <GoogleDriveConnection />
    </div>
  );
}
