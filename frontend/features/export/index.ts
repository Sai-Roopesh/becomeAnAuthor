// Public API for export feature
import { withErrorBoundary } from "@/features/shared/components";

// Components - Wrap ExportDialog with ErrorBoundary for resilient error handling
import { ExportDialog as ExportDialogBase } from "./components/export-dialog";
export const ExportDialog = withErrorBoundary(ExportDialogBase, {
  name: "Export Dialog",
  maxRetries: 3,
});

// Hooks
export { useExportPreview } from "./hooks/use-export-preview";
export { useExportPresets } from "./hooks/use-export-presets";

// Utils - CSS Themes (from shared constants)
export {
  CSS_THEMES,
  getThemeById,
  getThemeCSS,
} from "@/shared/constants/export/css-themes";
export type { CSSTheme } from "@/shared/constants/export/css-themes";

// Utils - Export Presets (from shared constants)
export {
  BUILT_IN_PRESETS,
  getPresetById,
  getPresetsByFormat,
  getPresetIds,
} from "@/shared/constants/export/export-presets";
