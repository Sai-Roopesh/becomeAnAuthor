// Public API for google-drive feature
import { withErrorBoundary } from "@/features/shared/components";

import { DriveBackupBrowser as DriveBackupBrowserBase } from "./components/DriveBackupBrowser";
export const DriveBackupBrowser = withErrorBoundary(DriveBackupBrowserBase, {
  name: "Drive Backup Browser",
});

export { InlineGoogleAuth } from "./components/InlineGoogleAuth";

// Hooks
export { useGoogleAuth } from "./hooks/use-google-auth";
export { useGoogleDrive } from "./hooks/use-google-drive";
