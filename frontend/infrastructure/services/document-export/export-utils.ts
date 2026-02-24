import type { DocumentNode } from "@/domain/entities/types";
import type {
  ExportConfigV2,
  ExportFontFamily,
} from "@/domain/types/export-types";
import type { SceneSectionType } from "@/shared/types/sections";

export interface SceneRecord {
  nextSceneExists: boolean;
}

export interface SceneContentBlock {
  key: string;
  heading: string | null;
  sectionType: SceneSectionType;
  isSection: boolean;
  paragraphs: string[];
}

export interface CodexAppendixEntry {
  id: string | null;
  label: string;
  mentionCount: number;
  sceneTitles: string[];
}

export interface PreparedExportData {
  orderedNodes: DocumentNode[];
  sceneRecords: SceneRecord[];
  codexAppendixEntries: CodexAppendixEntry[];
}

export function mapPdfPageSize(
  size: ExportConfigV2["pageSize"],
): "A4" | "LETTER" {
  return size === "A4" ? "A4" : "LETTER";
}

export function mapPdfFont(
  font: ExportFontFamily,
): "Times-Roman" | "Helvetica" | "Courier" {
  switch (font) {
    case "arial":
      return "Helvetica";
    case "courier":
      return "Courier";
    case "times":
    case "georgia":
    default:
      return "Times-Roman";
  }
}

export function mapPdfBoldFont(
  font: ExportFontFamily,
): "Times-Bold" | "Helvetica-Bold" | "Courier-Bold" {
  switch (font) {
    case "arial":
      return "Helvetica-Bold";
    case "courier":
      return "Courier-Bold";
    case "times":
    case "georgia":
    default:
      return "Times-Bold";
  }
}

export function mapDocxFont(font: ExportFontFamily): string {
  switch (font) {
    case "arial":
      return "Arial";
    case "courier":
      return "Courier New";
    case "georgia":
      return "Georgia";
    case "times":
    default:
      return "Times New Roman";
  }
}

export function mmToTwip(mm: number): number {
  return Math.round((mm * 1440) / 25.4);
}

export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

export function sanitizePdfText(value: string): string {
  const withoutControl = value.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
    "",
  );
  const withoutUnpaired = stripUnpairedSurrogates(withoutControl);
  return withoutUnpaired.normalize("NFC");
}

function stripUnpairedSurrogates(value: string): string {
  let output = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += value.charAt(i) + value.charAt(i + 1);
        i += 1;
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    output += value.charAt(i);
  }

  return output;
}

export function splitParagraphForPdf(paragraph: string): string[] {
  const MAX_SEGMENT_LENGTH = 1200;
  const normalized = paragraph.trim();
  if (normalized.length <= MAX_SEGMENT_LENGTH) {
    return [normalized];
  }

  const segments: string[] = [];
  let remaining = normalized;

  while (remaining.length > MAX_SEGMENT_LENGTH) {
    const slice = remaining.slice(0, MAX_SEGMENT_LENGTH);
    const sentenceBreak = slice.lastIndexOf(". ");
    const lineBreak = slice.lastIndexOf("\n");
    const whitespaceBreak = slice.lastIndexOf(" ");
    const breakIndex = Math.max(sentenceBreak + 1, lineBreak, whitespaceBreak);

    const safeBreak = breakIndex > 200 ? breakIndex : MAX_SEGMENT_LENGTH;
    const current = remaining.slice(0, safeBreak).trim();
    if (current.length > 0) {
      segments.push(current);
    }
    remaining = remaining.slice(safeBreak).trimStart();
  }

  if (remaining.length > 0) {
    segments.push(remaining);
  }

  return segments;
}
