/**
 * Document export hook.
 *
 * Focused on stable DOCX/PDF flows using native save dialogs.
 */
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "@/shared/utils/toast-service";
import { TauriNodeRepository } from "@/infrastructure/repositories/TauriNodeRepository";
import { showSaveDialog, exportManuscriptDocx } from "@/core/tauri/commands";
import { logger } from "@/shared/utils/logger";
import { useAppServices } from "@/infrastructure/di/AppContext";

const log = logger.scope("DocumentExport");

export interface DocumentExportOptions {
  title?: string;
  author?: string;
  includeTOC?: boolean;
}

export function useDocumentExport() {
  const { exportService } = useAppServices();
  const [isExporting, setIsExporting] = useState(false);

  const exportToDocx = async (
    _projectId: string,
    options?: DocumentExportOptions,
  ) => {
    setIsExporting(true);
    try {
      const projectPath = TauriNodeRepository.getInstance().getProjectPath();
      if (!projectPath) throw new Error("No project selected");

      const defaultName = `${toSafeFilename(options?.title || "manuscript")}.docx`;
      const savePath = await showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: "Word Document", extensions: ["docx"] }],
        title: "Export as DOCX",
      });

      if (!savePath) {
        toast.info("Export cancelled");
        return;
      }

      toast.info("Generating DOCX...");
      await exportManuscriptDocx(projectPath, savePath);

      toast.success(`DOCX exported to ${savePath.split("/").pop()}`);
      log.debug("DOCX exported", { path: savePath });
    } catch (error) {
      log.error("DOCX export failed", error);
      toast.error("Failed to export DOCX");
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async (
    projectId: string,
    options?: DocumentExportOptions,
  ) => {
    setIsExporting(true);
    try {
      const defaultName = `${toSafeFilename(options?.title || "manuscript")}.pdf`;
      const savePath = await showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: "PDF Document", extensions: ["pdf"] }],
        title: "Export as PDF",
      });

      if (!savePath) {
        toast.info("Export cancelled");
        return;
      }

      toast.info("Generating PDF...");

      const exportOptions: import("@/domain/services/IExportService").ExportOptions =
        {};
      if (options?.title) exportOptions.title = options.title;
      if (options?.author) exportOptions.author = options.author;
      if (typeof options?.includeTOC === "boolean") {
        exportOptions.includeTOC = options.includeTOC;
      }

      const blob = await exportService.exportToPDF(projectId, exportOptions);

      const buffer = await blob.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      await invoke("write_export_file", { filePath: savePath, data });

      toast.success(`PDF exported to ${savePath.split("/").pop()}`);
      log.debug("PDF exported", { path: savePath });
    } catch (error) {
      log.error("PDF export failed", error);
      toast.error("Failed to export PDF");
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToDocx,
    exportToPDF,
    isExporting,
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
