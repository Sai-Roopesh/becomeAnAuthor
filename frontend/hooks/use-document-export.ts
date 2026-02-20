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
    let progressToastId: string | number | undefined;

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

      progressToastId = toast.loading(
        `Generating ${resolved.format.toUpperCase()}...`,
      );

      const blob =
        resolved.format === "pdf"
          ? await withTimeout(
              exportService.exportToPDF(projectId, resolved),
              180000,
              "PDF generation timed out",
            )
          : await withTimeout(
              exportService.exportToDOCX(projectId, resolved),
              120000,
              "DOCX generation timed out",
            );

      const buffer = await blob.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      toast.loading(`Saving ${resolved.format.toUpperCase()}...`, {
        id: progressToastId,
      });
      await withTimeout(
        invoke("write_export_file", { filePath: savePath, data }),
        120000,
        "File save timed out",
      );

      toast.success(
        `${resolved.format.toUpperCase()} exported to ${savePath.split("/").pop()}`,
        progressToastId !== undefined ? { id: progressToastId } : undefined,
      );
      log.debug("Document exported", {
        format: resolved.format,
        path: savePath,
      });
    } catch (error) {
      log.error("Document export failed", error);
      toast.error(
        "Failed to export document",
        progressToastId !== undefined ? { id: progressToastId } : undefined,
      );
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
