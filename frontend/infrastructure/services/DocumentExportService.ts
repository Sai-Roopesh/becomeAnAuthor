import { createElement, type ReactElement } from "react";
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  type ISectionOptions,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  TextRun,
  type IParagraphStylePropertiesOptions,
} from "docx";
import type { DocumentProps as ReactPdfDocumentProps } from "@react-pdf/renderer";
import type { Scene, DocumentNode } from "@/domain/entities/types";
import type { INodeRepository } from "@/domain/repositories/INodeRepository";
import type { IExportService } from "@/domain/services/IExportService";
import {
  type ExportConfigV2,
  type ExportFontFamily,
  type ExportSceneBreakStyle,
  EXPORT_PAGE_SIZES_MM,
  withExportDefaults,
} from "@/domain/types/export-types";
import { extractTextFromTiptapJSON } from "@/shared/utils/editor";

interface SceneRecord {
  nextSceneExists: boolean;
}

/**
 * Document Export Service
 *
 * Uses one shared export configuration for DOCX/PDF and traverses the node tree
 * defensively so restored/legacy structures still export all scene content.
 */
export class DocumentExportService implements IExportService {
  constructor(private nodeRepository: INodeRepository) {}

  async exportToPDF(projectId: string, config: ExportConfigV2): Promise<Blob> {
    const resolved = withExportDefaults(config);
    const [
      { pdf, Document: PdfDocument, Page, Text, View, StyleSheet, Font },
      nodes,
    ] = await Promise.all([
      import("@react-pdf/renderer"),
      this.getHydratedNodes(projectId),
    ]);

    // Upstream v4.x has instability around dynamic text render callbacks.
    // Use deterministic text flow + explicit post-processing for page numbers.
    Font.registerHyphenationCallback((word: string) =>
      createHyphenationChunks(word),
    );

    const orderedNodes = this.getOrderedNodes(nodes);
    const sceneRecords = this.getSceneRecords(orderedNodes);

    const pageSize = mapPdfPageSize(resolved.pageSize);
    const marginTop = mmToPt(resolved.marginsMm.top);
    const marginRight = mmToPt(resolved.marginsMm.right);
    const marginBottom = mmToPt(resolved.marginsMm.bottom);
    const marginLeft = mmToPt(resolved.marginsMm.left);

    const baseFont = mapPdfFont(resolved.fontFamily);
    const boldFont = mapPdfBoldFont(resolved.fontFamily);

    const styles = StyleSheet.create({
      page: {
        paddingTop: marginTop,
        paddingRight: marginRight,
        paddingBottom: marginBottom,
        paddingLeft: marginLeft,
        fontFamily: baseFont,
        fontSize: resolved.fontSizePt,
        lineHeight: resolved.fontSizePt * resolved.lineHeight,
        color: "#111111",
      },
      title: {
        fontFamily: boldFont,
        fontSize: resolved.fontSizePt + 10,
        marginBottom: 10,
        textAlign: "center",
      },
      author: {
        fontSize: resolved.fontSizePt,
        marginBottom: 16,
        textAlign: "center",
      },
      h1: {
        fontFamily: boldFont,
        fontSize: resolved.fontSizePt + 6,
        marginTop: 12,
        marginBottom: 6,
      },
      h2: {
        fontFamily: boldFont,
        fontSize: resolved.fontSizePt + 3,
        marginTop: 10,
        marginBottom: 5,
      },
      h3: {
        fontFamily: boldFont,
        fontSize: resolved.fontSizePt + 1,
        marginTop: 8,
        marginBottom: 4,
      },
      paragraph: {
        textAlign: resolved.alignment,
        marginBottom: resolved.paragraphSpacingPt,
      },
      summary: {
        fontSize: Math.max(9, resolved.fontSizePt - 1),
        marginBottom: resolved.paragraphSpacingPt,
        color: "#4b5563",
        fontStyle: "italic",
      },
      tocHeading: {
        fontFamily: boldFont,
        fontSize: resolved.fontSizePt + 2,
        marginTop: 4,
        marginBottom: 8,
      },
      tocItem1: {
        marginBottom: 3,
      },
      tocItem2: {
        marginLeft: 12,
        marginBottom: 2,
      },
      divider: {
        borderBottomColor: "#c7c7c7",
        borderBottomWidth: 1,
        marginVertical: 8,
      },
      spacer: {
        height: resolved.fontSizePt,
      },
      sceneBreakText: {
        textAlign: "center",
        marginVertical: 8,
        letterSpacing: 2,
      },
    });

    const pageChildren: ReactElement[] = [];

    if (resolved.includeTitlePage && (resolved.title || resolved.author)) {
      if (resolved.title) {
        pageChildren.push(
          createElement(
            Text,
            { key: "meta-title", style: styles.title },
            sanitizePdfText(resolved.title),
          ),
        );
      }
      if (resolved.author) {
        pageChildren.push(
          createElement(
            Text,
            { key: "meta-author", style: styles.author },
            `By ${sanitizePdfText(resolved.author)}`,
          ),
        );
      }
      pageChildren.push(
        createElement(View, {
          key: "title-page-break",
          break: true,
        }),
      );
    }

    if (resolved.includeTOC) {
      pageChildren.push(
        createElement(
          Text,
          { key: "toc-heading", style: styles.tocHeading },
          "Table of Contents",
        ),
      );
      const tocEntries = this.getTocEntries(orderedNodes, resolved);
      tocEntries.forEach((entry, index) => {
        pageChildren.push(
          createElement(
            Text,
            {
              key: `toc-${entry.level}-${index}`,
              style: entry.level === 1 ? styles.tocItem1 : styles.tocItem2,
            },
            sanitizePdfText(entry.text),
          ),
        );
      });
      pageChildren.push(
        createElement(View, { key: "toc-page-break", break: true }),
      );
    }

    let chapterCount = 0;
    let sceneIndex = 0;

    orderedNodes.forEach((node, index) => {
      if (node.type === "act") {
        if (!resolved.includeActHeadings) return;
        pageChildren.push(
          createElement(
            Text,
            { key: `act-${node.id}-${index}`, style: styles.h1 },
            sanitizePdfText(node.title),
          ),
        );
        return;
      }

      if (node.type === "chapter") {
        if (!resolved.includeChapterHeadings) return;
        const shouldPageBreak =
          resolved.chapterStartsOnNewPage && chapterCount > 0;
        chapterCount += 1;
        pageChildren.push(
          createElement(
            Text,
            {
              key: `chapter-${node.id}-${index}`,
              style: styles.h2,
              break: shouldPageBreak,
            },
            sanitizePdfText(node.title),
          ),
        );
        return;
      }

      const record = sceneRecords[sceneIndex];
      sceneIndex += 1;
      if (!record) return;

      if (resolved.includeSceneTitles) {
        pageChildren.push(
          createElement(
            Text,
            { key: `scene-title-${node.id}-${index}`, style: styles.h3 },
            sanitizePdfText(node.title),
          ),
        );
      }

      if (resolved.includeSummaries && node.summary.trim()) {
        pageChildren.push(
          createElement(
            Text,
            { key: `scene-summary-${node.id}-${index}`, style: styles.summary },
            sanitizePdfText(node.summary.trim()),
          ),
        );
      }

      const paragraphs = this.getSceneParagraphs(node);
      paragraphs.forEach((paragraph, paraIndex) => {
        pageChildren.push(
          createElement(
            Text,
            {
              key: `scene-${node.id}-para-${paraIndex}`,
              style: styles.paragraph,
            },
            sanitizePdfText(paragraph),
          ),
        );
      });

      if (record.nextSceneExists) {
        if (resolved.sceneBreakStyle === "blank-line") {
          pageChildren.push(
            createElement(View, {
              key: `sb-gap-${node.id}`,
              style: styles.spacer,
            }),
          );
        } else if (resolved.sceneBreakStyle === "divider") {
          pageChildren.push(
            createElement(View, {
              key: `sb-divider-${node.id}`,
              style: styles.divider,
            }),
          );
        } else {
          pageChildren.push(
            createElement(
              Text,
              { key: `sb-stars-${node.id}`, style: styles.sceneBreakText },
              "***",
            ),
          );
        }
      }
    });

    if (pageChildren.length === 0) {
      pageChildren.push(
        createElement(
          Text,
          { key: "empty-doc", style: styles.paragraph },
          "No manuscript content found.",
        ),
      );
    }

    if (resolved.includePageNumbers) {
      // Page numbers are stamped after render via pdf-lib.
    }

    const pdfDocumentProps: ReactPdfDocumentProps = {
      title: resolved.title || "Manuscript",
    };
    if (resolved.author) {
      pdfDocumentProps.author = resolved.author;
    }

    const documentNode = createElement(
      PdfDocument,
      pdfDocumentProps,
      createElement(
        Page,
        {
          size: pageSize,
          style: styles.page,
          wrap: true,
        },
        ...pageChildren,
      ),
    );

    const rendered = await pdf(
      documentNode as ReactElement<ReactPdfDocumentProps>,
    ).toBlob();

    if (!resolved.includePageNumbers) {
      return rendered;
    }

    return this.stampPdfPageNumbers(rendered, {
      marginRightPt: marginRight,
      marginBottomPt: marginBottom,
      fontSize: 9,
    });
  }

  async exportToDOCX(projectId: string, config: ExportConfigV2): Promise<Blob> {
    const resolved = withExportDefaults(config);
    const nodes = await this.getHydratedNodes(projectId);
    const orderedNodes = this.getOrderedNodes(nodes);
    const sceneRecords = this.getSceneRecords(orderedNodes);

    const { width, height } = EXPORT_PAGE_SIZES_MM[resolved.pageSize];

    const children: Paragraph[] = [];

    if (resolved.includeTitlePage && (resolved.title || resolved.author)) {
      if (resolved.title) {
        children.push(
          new Paragraph({
            text: sanitizePdfText(resolved.title),
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
          }),
        );
      }
      if (resolved.author) {
        children.push(
          new Paragraph({
            text: `By ${sanitizePdfText(resolved.author)}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
        );
      }
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (resolved.includeTOC) {
      children.push(
        new Paragraph({
          text: "Table of Contents",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 220 },
        }),
      );

      this.getTocEntries(orderedNodes, resolved).forEach((entry) => {
        children.push(
          new Paragraph({
            text: `${entry.level === 1 ? "" : "  "}${sanitizePdfText(entry.text)}`,
            spacing: { after: 80 },
          }),
        );
      });

      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    const paragraphStyle: IParagraphStylePropertiesOptions = {
      spacing: {
        line: Math.round(resolved.lineHeight * resolved.fontSizePt * 20),
        after: Math.round(resolved.paragraphSpacingPt * 20),
      },
      alignment:
        resolved.alignment === "justify"
          ? AlignmentType.JUSTIFIED
          : AlignmentType.LEFT,
    };

    let chapterCount = 0;
    let sceneIndex = 0;

    orderedNodes.forEach((node) => {
      if (node.type === "act") {
        if (!resolved.includeActHeadings) return;
        children.push(
          new Paragraph({
            text: sanitizePdfText(node.title),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 320, after: 180 },
          }),
        );
        return;
      }

      if (node.type === "chapter") {
        if (!resolved.includeChapterHeadings) return;

        if (resolved.chapterStartsOnNewPage && chapterCount > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        chapterCount += 1;
        children.push(
          new Paragraph({
            text: sanitizePdfText(node.title),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 140 },
          }),
        );
        return;
      }

      const record = sceneRecords[sceneIndex];
      sceneIndex += 1;
      if (!record) return;

      if (resolved.includeSceneTitles) {
        children.push(
          new Paragraph({
            text: sanitizePdfText(node.title),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 100 },
          }),
        );
      }

      if (resolved.includeSummaries && node.summary.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sanitizePdfText(node.summary.trim()),
                italics: true,
                color: "555555",
              }),
            ],
            spacing: { after: Math.round(resolved.paragraphSpacingPt * 20) },
          }),
        );
      }

      const paragraphs = this.getSceneParagraphs(node);
      paragraphs.forEach((paragraph) => {
        children.push(
          new Paragraph({
            children: [new TextRun(paragraph)],
            ...paragraphStyle,
          }),
        );
      });

      if (record.nextSceneExists) {
        this.pushDocxSceneBreak(children, resolved.sceneBreakStyle);
      }
    });

    if (children.length === 0) {
      children.push(new Paragraph("No manuscript content found."));
    }

    const footer = resolved.includePageNumbers
      ? new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                }),
              ],
            }),
          ],
        })
      : undefined;

    const section: ISectionOptions = {
      ...(footer ? { footers: { default: footer } } : {}),
      properties: {
        page: {
          size: {
            width: mmToTwip(width),
            height: mmToTwip(height),
          },
          margin: {
            top: mmToTwip(resolved.marginsMm.top),
            right: mmToTwip(resolved.marginsMm.right),
            bottom: mmToTwip(resolved.marginsMm.bottom),
            left: mmToTwip(resolved.marginsMm.left),
            header: 720,
            footer: 720,
            gutter: 0,
          },
        },
      },
      children,
    };

    const documentOptions: ConstructorParameters<typeof Document>[0] = {
      ...(resolved.title ? { title: resolved.title } : {}),
      ...(resolved.author ? { creator: resolved.author } : {}),
      sections: [section],
      styles: {
        default: {
          document: {
            run: {
              font: mapDocxFont(resolved.fontFamily),
              size: Math.round(resolved.fontSizePt * 2),
            },
            paragraph: paragraphStyle,
          },
        },
      },
    };

    const document = new Document(documentOptions);

    return await Packer.toBlob(document);
  }

  async exportToMarkdown(
    projectId: string,
    config?: Partial<ExportConfigV2>,
  ): Promise<string> {
    const resolved = withExportDefaults({
      includeTOC: false,
      ...config,
    });
    const nodes = await this.getHydratedNodes(projectId);
    const orderedNodes = this.getOrderedNodes(nodes);
    const sceneRecords = this.getSceneRecords(orderedNodes);

    const parts: string[] = [];

    if (resolved.title) {
      parts.push(`# ${resolved.title}`);
    }
    if (resolved.author) {
      parts.push(`**By ${resolved.author}**`);
    }
    if (parts.length > 0) {
      parts.push("");
    }

    if (resolved.includeTOC) {
      parts.push("## Table of Contents");
      this.getTocEntries(orderedNodes, resolved).forEach((entry) => {
        parts.push(`${entry.level === 1 ? "-" : "  -"} ${entry.text}`);
      });
      parts.push("", "---", "");
    }

    let chapterCount = 0;
    let sceneIndex = 0;

    orderedNodes.forEach((node) => {
      if (node.type === "act") {
        if (resolved.includeActHeadings) {
          parts.push(`# ${node.title}`, "");
        }
        return;
      }

      if (node.type === "chapter") {
        if (resolved.includeChapterHeadings) {
          if (resolved.chapterStartsOnNewPage && chapterCount > 0) {
            parts.push("---", "");
          }
          parts.push(`## ${node.title}`, "");
        }
        chapterCount += 1;
        return;
      }

      const record = sceneRecords[sceneIndex];
      sceneIndex += 1;
      if (!record) return;

      if (resolved.includeSceneTitles) {
        parts.push(`### ${node.title}`);
      }
      if (resolved.includeSummaries && node.summary.trim()) {
        parts.push(`> ${node.summary.trim()}`);
      }

      const paragraphs = this.getSceneParagraphs(node);
      if (paragraphs.length > 0) {
        parts.push(paragraphs.join("\n\n"));
      }

      if (record.nextSceneExists) {
        if (resolved.sceneBreakStyle === "asterisks") {
          parts.push("", "***");
        } else if (resolved.sceneBreakStyle === "divider") {
          parts.push("", "---");
        }
      }

      parts.push("");
    });

    return parts.join("\n").trim();
  }

  private async getHydratedNodes(projectId: string): Promise<DocumentNode[]> {
    const nodes = (await this.nodeRepository.getByProject(
      projectId,
    )) as DocumentNode[];
    const scenes = nodes.filter((node): node is Scene => node.type === "scene");

    const hydratedScenes = await Promise.all(
      scenes.map(async (scene) => {
        if (this.sceneHasTextContent(scene)) return scene;

        try {
          const loaded = await this.nodeRepository.get(scene.id);
          if (loaded?.type === "scene") {
            return {
              ...scene,
              ...loaded,
              content: loaded.content ?? scene.content,
            } as Scene;
          }
        } catch {
          // Keep original scene when hydration fails.
        }

        return scene;
      }),
    );

    const sceneMap = new Map(hydratedScenes.map((scene) => [scene.id, scene]));

    return nodes.map((node) => {
      if (node.type !== "scene") return node;
      return sceneMap.get(node.id) ?? node;
    });
  }

  private sceneHasTextContent(scene: Scene): boolean {
    const text = extractTextFromTiptapJSON(scene.content);
    return text.trim().length > 0;
  }

  private getSceneParagraphs(scene: Scene): string[] {
    const text = extractTextFromTiptapJSON(scene.content).trim();
    if (!text) return [];

    return text
      .split(/\n\s*\n+/)
      .map((paragraph) =>
        sanitizePdfText(paragraph).replace(/\s+/g, " ").trim(),
      )
      .filter((paragraph) => paragraph.length > 0);
  }

  private getOrderedNodes(nodes: DocumentNode[]): DocumentNode[] {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const children = new Map<string | null, DocumentNode[]>();

    const appendChild = (parentId: string | null, child: DocumentNode) => {
      const bucket = children.get(parentId) ?? [];
      bucket.push(child);
      children.set(parentId, bucket);
    };

    nodes.forEach((node) => {
      const hasParent = node.parentId ? nodeById.has(node.parentId) : false;
      appendChild(hasParent ? node.parentId : null, node);
    });

    const sortNodes = (value: DocumentNode[]): DocumentNode[] => {
      return [...value].sort((a, b) => {
        const orderDiff = a.order - b.order;
        if (orderDiff !== 0) return orderDiff;
        const updatedDiff = a.updatedAt - b.updatedAt;
        if (updatedDiff !== 0) return updatedDiff;
        return a.title.localeCompare(b.title);
      });
    };

    const ordered: DocumentNode[] = [];
    const visited = new Set<string>();

    const visit = (node: DocumentNode) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      ordered.push(node);

      const descendants = sortNodes(children.get(node.id) ?? []);
      descendants.forEach(visit);
    };

    sortNodes(children.get(null) ?? []).forEach(visit);

    if (ordered.length < nodes.length) {
      sortNodes(nodes).forEach(visit);
    }

    return ordered;
  }

  private getSceneRecords(orderedNodes: DocumentNode[]): SceneRecord[] {
    const scenes = orderedNodes.filter(
      (node): node is Scene => node.type === "scene",
    );
    return scenes.map((_, index) => ({
      nextSceneExists: index < scenes.length - 1,
    }));
  }

  private getTocEntries(
    orderedNodes: DocumentNode[],
    config: ExportConfigV2,
  ): Array<{ level: 1 | 2; text: string }> {
    const entries: Array<{ level: 1 | 2; text: string }> = [];

    orderedNodes.forEach((node) => {
      if (node.type === "act" && config.includeActHeadings) {
        entries.push({ level: 1, text: node.title });
      }

      if (node.type === "chapter" && config.includeChapterHeadings) {
        entries.push({ level: 2, text: node.title });
      }
    });

    if (entries.length === 0) {
      entries.push({ level: 1, text: "Manuscript" });
    }

    return entries;
  }

  private pushDocxSceneBreak(
    target: Paragraph[],
    style: ExportSceneBreakStyle,
  ): void {
    if (style === "blank-line") {
      target.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      return;
    }

    if (style === "divider") {
      target.push(
        new Paragraph({
          text: "--------------------------------------------------",
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
        }),
      );
      return;
    }

    target.push(
      new Paragraph({
        text: "***",
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
      }),
    );
  }

  private async stampPdfPageNumbers(
    pdfBlob: Blob,
    options: {
      marginRightPt: number;
      marginBottomPt: number;
      fontSize: number;
    },
  ): Promise<Blob> {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const document = await PDFDocument.load(bytes);
    const pages = document.getPages();
    const totalPages = pages.length;
    if (totalPages === 0) return pdfBlob;

    const font = await document.embedFont(StandardFonts.Helvetica);
    const color = rgb(0.42, 0.45, 0.5);

    pages.forEach((page, pageIndex) => {
      const label = `${pageIndex + 1} / ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(label, options.fontSize);
      const x = Math.max(
        16,
        page.getWidth() - options.marginRightPt - textWidth,
      );
      const y = Math.max(14, options.marginBottomPt * 0.33);

      page.drawText(label, {
        x,
        y,
        size: options.fontSize,
        font,
        color,
      });
    });

    const output = await document.save();
    const outputBytes = Uint8Array.from(output);
    return new Blob([outputBytes], { type: "application/pdf" });
  }
}

function mapPdfPageSize(size: ExportConfigV2["pageSize"]): "A4" | "LETTER" {
  return size === "A4" ? "A4" : "LETTER";
}

function mapPdfFont(
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

function mapPdfBoldFont(
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

function mapDocxFont(font: ExportFontFamily): string {
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

function mmToTwip(mm: number): number {
  return Math.round((mm * 1440) / 25.4);
}

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

function sanitizePdfText(value: string): string {
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

function createHyphenationChunks(word: string): string[] {
  if (word.length <= 28) return [word];
  if (/\s/.test(word)) return [word];

  const parts: string[] = [];
  for (let index = 0; index < word.length; index += 16) {
    parts.push(word.slice(index, index + 16));
  }
  return parts;
}
