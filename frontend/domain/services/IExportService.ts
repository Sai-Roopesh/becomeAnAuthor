import type { ExportConfigV2 } from "@/domain/types/export-types";

/**
 * Export service contract for manuscript output.
 */
export interface IExportService {
  /** Generate PDF bytes from project content with customization config. */
  exportToPDF(projectId: string, config: ExportConfigV2): Promise<Blob>;

  /** Generate DOCX bytes from project content with customization config. */
  exportToDOCX(projectId: string, config: ExportConfigV2): Promise<Blob>;

  /** Generate markdown text from project content (used internally for diagnostics). */
  exportToMarkdown(
    projectId: string,
    config?: Partial<ExportConfigV2>,
  ): Promise<string>;
}
