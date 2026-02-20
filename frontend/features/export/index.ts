// Public API for export feature
import { withErrorBoundary } from "@/features/shared/components";

import { ExportDialog as ExportDialogBase } from "./components/export-dialog";

export const ExportDialog = withErrorBoundary(ExportDialogBase, {
  name: "Export Dialog",
  maxRetries: 3,
});
