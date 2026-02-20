/**
 * Shared export customization types for DOCX/PDF.
 *
 * The app currently supports two stable outputs:
 * - DOCX (editable manuscript)
 * - PDF (print/share output)
 */

export type ExportFormat = "docx" | "pdf";

export type ExportPageSize = "A4" | "Letter";

export type ExportFontFamily = "times" | "georgia" | "arial" | "courier";

export type ExportAlignment = "left" | "justify";

export type ExportSceneBreakStyle = "blank-line" | "asterisks" | "divider";

export interface ExportMarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ExportConfigV2 {
  format: ExportFormat;
  title: string;
  author: string;

  includeTitlePage: boolean;
  includeTOC: boolean;
  includeActHeadings: boolean;
  includeChapterHeadings: boolean;
  includeSceneTitles: boolean;
  includeSummaries: boolean;
  includePageNumbers: boolean;
  chapterStartsOnNewPage: boolean;

  sceneBreakStyle: ExportSceneBreakStyle;
  pageSize: ExportPageSize;
  marginsMm: ExportMarginsMm;

  fontFamily: ExportFontFamily;
  fontSizePt: number;
  lineHeight: number;
  paragraphSpacingPt: number;
  alignment: ExportAlignment;
}

export const EXPORT_PAGE_SIZES_MM: Record<
  ExportPageSize,
  { width: number; height: number }
> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

export const DEFAULT_EXPORT_CONFIG: ExportConfigV2 = {
  format: "docx",
  title: "",
  author: "",
  includeTitlePage: true,
  includeTOC: true,
  includeActHeadings: true,
  includeChapterHeadings: true,
  includeSceneTitles: true,
  includeSummaries: false,
  includePageNumbers: true,
  chapterStartsOnNewPage: true,
  sceneBreakStyle: "asterisks",
  pageSize: "Letter",
  marginsMm: {
    top: 25.4,
    right: 25.4,
    bottom: 25.4,
    left: 25.4,
  },
  fontFamily: "times",
  fontSizePt: 12,
  lineHeight: 1.6,
  paragraphSpacingPt: 6,
  alignment: "left",
};

export function withExportDefaults(
  value?: Partial<ExportConfigV2>,
): ExportConfigV2 {
  const merged: ExportConfigV2 = {
    ...DEFAULT_EXPORT_CONFIG,
    ...value,
    marginsMm: {
      ...DEFAULT_EXPORT_CONFIG.marginsMm,
      ...(value?.marginsMm ?? {}),
    },
  };

  return {
    ...merged,
    fontSizePt: clampNumber(merged.fontSizePt, 9, 18),
    lineHeight: clampNumber(merged.lineHeight, 1.2, 2.5),
    paragraphSpacingPt: clampNumber(merged.paragraphSpacingPt, 0, 24),
    marginsMm: {
      top: clampNumber(merged.marginsMm.top, 8, 50),
      right: clampNumber(merged.marginsMm.right, 8, 50),
      bottom: clampNumber(merged.marginsMm.bottom, 8, 50),
      left: clampNumber(merged.marginsMm.left, 8, 50),
    },
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
