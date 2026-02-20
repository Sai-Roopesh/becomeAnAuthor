/**
 * Document export hook.
 *
 * Routes DOCX/PDF export through the shared ExportConfigV2 pipeline.
 */
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import {
  DEFAULT_EXPORT_CONFIG,
  type ExportConfigV2,
  withExportDefaults,
} from "@/domain/types/export-types";
import { showSaveDialog } from "@/core/tauri/commands";
import { logger } from "@/shared/utils/logger";
import { toast } from "@/shared/utils/toast-service";
import { useAppServices } from "@/infrastructure/di/AppContext";

const log = logger.scope("DocumentExport");

export function useDocumentExport() {
  const { exportService } = useAppServices();
  const [isExporting, setIsExporting] = useState(false);

  const exportDocument = async (
    projectId: string,
    config: Partial<ExportConfigV2>,
  ): Promise<void> => {
    const resolved = withExportDefaults(config);

    setIsExporting(true);
    try {
      const extension = resolved.format === "pdf" ? "pdf" : "docx";
      const defaultName = `${toSafeFilename(resolved.title || "manuscript")}.${extension}`;
      const savePath = await showSaveDialog({
        defaultPath: defaultName,
        filters: [
          {
            name: resolved.format === "pdf" ? "PDF Document" : "Word Document",
            extensions: [extension],
          },
        ],
        title: `Export as ${resolved.format.toUpperCase()}`,
      });

      if (!savePath) {
        toast.info("Export cancelled");
        return;
      }

      toast.info(`Generating ${resolved.format.toUpperCase()}...`);

      const blob =
        resolved.format === "pdf"
          ? await exportService.exportToPDF(projectId, resolved)
          : await exportService.exportToDOCX(projectId, resolved);

      const buffer = await blob.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      await invoke("write_export_file", { filePath: savePath, data });

      toast.success(
        `${resolved.format.toUpperCase()} exported to ${savePath.split("/").pop()}`,
      );
      log.debug("Document exported", {
        format: resolved.format,
        path: savePath,
      });
    } catch (error) {
      log.error("Document export failed", error);
      toast.error("Failed to export document");
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportDocument,
    isExporting,
    defaultConfig: DEFAULT_EXPORT_CONFIG,
  };
}

function toSafeFilename(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "manuscript";

  return trimmed
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .trim();
}
