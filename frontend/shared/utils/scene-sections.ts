import type { TiptapContent, TiptapNode } from "@/shared/types/tiptap";
import { extractTextFromTiptapJSON } from "@/shared/utils/editor";
import {
  DEFAULT_SCENE_SECTION_TITLE,
  DEFAULT_SCENE_SECTION_TYPE,
  isSceneSectionType,
  type SceneSectionType,
} from "@/shared/types/sections";

interface SectionNodeAttrs {
  title?: unknown;
  sectionType?: unknown;
  excludeFromAI?: unknown;
}

export interface SceneSectionSegment {
  key: string;
  title: string;
  sectionType: SceneSectionType;
  excludeFromAI: boolean;
  isSection: boolean;
  paragraphs: string[];
}

interface SceneSectionExtractionOptions {
  includeExcludedSections?: boolean;
}

export function extractSceneSectionSegments(
  content: TiptapContent | null | undefined,
  options?: SceneSectionExtractionOptions,
): SceneSectionSegment[] {
  if (!content?.content || !Array.isArray(content.content)) {
    return [];
  }

  const includeExcludedSections = options?.includeExcludedSections ?? true;
  const segments: SceneSectionSegment[] = [];
  let bodyBuffer: TiptapNode[] = [];

  const flushBody = () => {
    if (bodyBuffer.length === 0) return;
    const paragraphs = extractParagraphs(bodyBuffer);
    if (paragraphs.length === 0) {
      bodyBuffer = [];
      return;
    }

    segments.push({
      key: `body-${segments.length}`,
      title: "",
      sectionType: DEFAULT_SCENE_SECTION_TYPE,
      excludeFromAI: false,
      isSection: false,
      paragraphs,
    });
    bodyBuffer = [];
  };

  content.content.forEach((node, index) => {
    if (node.type !== "section") {
      bodyBuffer.push(node);
      return;
    }

    flushBody();

    const attrs = parseSectionAttrs(node.attrs);
    if (!includeExcludedSections && attrs.excludeFromAI) {
      return;
    }

    const sectionContent = Array.isArray(node.content) ? node.content : [];
    segments.push({
      key: `section-${index}`,
      title: attrs.title,
      sectionType: attrs.sectionType,
      excludeFromAI: attrs.excludeFromAI,
      isSection: true,
      paragraphs: extractParagraphs(sectionContent),
    });
  });

  flushBody();
  return segments;
}

export function extractSceneTextForIntelligence(
  content: TiptapContent | null | undefined,
): string {
  const segments = extractSceneSectionSegments(content, {
    includeExcludedSections: false,
  });
  return segments
    .flatMap((segment) => segment.paragraphs)
    .join("\n\n")
    .trim();
}

export function getSceneSectionWarnings(
  content: TiptapContent | null | undefined,
): string[] {
  const sections = extractSceneSectionSegments(content).filter(
    (segment) => segment.isSection,
  );
  if (sections.length === 0) return [];

  const warnings: string[] = [];

  if (
    sections.some(
      (section) =>
        section.title.trim().length === 0 ||
        section.title.trim().toLowerCase() ===
          DEFAULT_SCENE_SECTION_TITLE.toLowerCase(),
    )
  ) {
    warnings.push(
      "Some sections are untitled. Add specific titles so export headings and TOC entries stay meaningful.",
    );
  }

  if (
    sections.some(
      (section) =>
        section.paragraphs.join(" ").replace(/\s+/g, " ").trim().length === 0,
    )
  ) {
    warnings.push(
      "Some sections are empty. Fill or remove them to keep exported structure clean.",
    );
  }

  const numberedSections = sections
    .map((section) => extractNumericSectionOrder(section.title))
    .filter((value): value is number => value !== null);

  if (
    numberedSections.length >= 2 &&
    !isSequentialAscending(numberedSections)
  ) {
    warnings.push(
      "Section numbering looks misordered. Align numeric section titles to maintain a consistent flow.",
    );
  }

  return warnings;
}

function extractParagraphs(nodes: TiptapNode[]): string[] {
  const text = extractTextFromTiptapJSON({
    type: "doc",
    content: nodes,
  }).trim();

  if (!text) return [];

  return text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);
}

function parseSectionAttrs(attrs: unknown): {
  title: string;
  sectionType: SceneSectionType;
  excludeFromAI: boolean;
} {
  const record = (attrs ?? {}) as SectionNodeAttrs;
  const title =
    typeof record.title === "string" && record.title.trim().length > 0
      ? record.title.trim()
      : DEFAULT_SCENE_SECTION_TITLE;
  const sectionType = isSceneSectionType(record.sectionType)
    ? record.sectionType
    : DEFAULT_SCENE_SECTION_TYPE;
  const excludeFromAI = record.excludeFromAI === true;

  return {
    title,
    sectionType,
    excludeFromAI,
  };
}

function extractNumericSectionOrder(title: string): number | null {
  const match = title.match(/(?:^|\bsection\s+)(\d+)\b/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSequentialAscending(values: number[]): boolean {
  if (values.length < 2) return true;
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (!previous || !current) continue;
    if (current !== previous + 1) return false;
  }
  return true;
}
