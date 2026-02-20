import type {
  IExportService,
  ExportOptions,
} from "@/domain/services/IExportService";
import type { INodeRepository } from "@/domain/repositories/INodeRepository";
import type { Scene, DocumentNode } from "@/domain/entities/types";
import { extractTextFromTiptapJSON } from "@/shared/utils/editor";
import { BUILT_IN_PRESETS } from "@/shared/constants/export/export-presets";
import { createElement, type ReactElement } from "react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  AlignmentType,
} from "docx";

/**
 * Document Export Service
 * Handles export to various formats (PDF, DOCX, Markdown)
 */
export class DocumentExportService implements IExportService {
  constructor(private nodeRepository: INodeRepository) {}

  private sceneHasTextContent(scene: Scene): boolean {
    const text = extractTextFromTiptapJSON(scene.content);
    return text.trim().length > 0;
  }

  private async getNodesAndScenes(
    projectId: string,
  ): Promise<{ nodes: DocumentNode[]; scenes: Scene[] }> {
    const nodes = (await this.nodeRepository.getByProject(
      projectId,
    )) as DocumentNode[];
    const rawScenes = nodes.filter(
      (node): node is Scene => node.type === "scene",
    );

    const scenes = await Promise.all(
      rawScenes.map(async (scene) => {
        if (this.sceneHasTextContent(scene)) {
          return scene;
        }

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
          // Ignore single scene hydration failures and keep fallback scene.
        }

        return scene;
      }),
    );

    const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));
    const hydratedNodes = nodes.map((node) =>
      node.type === "scene" ? (sceneMap.get(node.id) ?? node) : node,
    ) as DocumentNode[];

    return { nodes: hydratedNodes, scenes };
  }

  /**
   * Export to PDF using react-pdf/renderer.
   * This avoids html2canvas/CSS compatibility issues in desktop WebViews.
   */
  async exportToPDF(projectId: string, options?: ExportOptions): Promise<Blob> {
    const [{ pdf, Document: PdfDocument, Page, Text, View, StyleSheet }] =
      await Promise.all([import("@react-pdf/renderer")]);

    const markdown = await this.exportToMarkdown(projectId, options);
    const blocks = this.parseMarkdownToPdfBlocks(markdown);

    if (blocks.length === 0) {
      blocks.push({
        kind: "paragraph",
        text: "No manuscript content found.",
      });
    }

    const styles = StyleSheet.create({
      page: {
        paddingTop: 54,
        paddingBottom: 54,
        paddingHorizontal: 56,
        fontFamily: "Times-Roman",
        fontSize: 11,
        lineHeight: 1.5,
        color: "#111827",
      },
      title: {
        fontFamily: "Times-Bold",
        fontSize: 22,
        marginBottom: 8,
        textAlign: "center",
      },
      author: {
        fontSize: 12,
        marginBottom: 20,
        textAlign: "center",
      },
      h1: {
        fontFamily: "Times-Bold",
        fontSize: 18,
        marginTop: 16,
        marginBottom: 8,
      },
      h2: {
        fontFamily: "Times-Bold",
        fontSize: 15,
        marginTop: 14,
        marginBottom: 6,
      },
      h3: {
        fontFamily: "Times-Bold",
        fontSize: 12.5,
        marginTop: 12,
        marginBottom: 4,
      },
      paragraph: {
        fontSize: 11,
        marginBottom: 8,
        textAlign: "justify",
      },
      rule: {
        marginTop: 8,
        marginBottom: 8,
        borderBottomColor: "#d1d5db",
        borderBottomWidth: 1,
      },
    });

    const pageChildren: ReactElement[] = [];

    if (options?.title) {
      pageChildren.push(
        createElement(
          Text,
          { key: "meta-title", style: styles.title },
          options.title,
        ),
      );
    }
    if (options?.author) {
      pageChildren.push(
        createElement(
          Text,
          { key: "meta-author", style: styles.author },
          `By ${options.author}`,
        ),
      );
    }

    blocks.forEach((block, index) => {
      if (block.kind === "rule") {
        pageChildren.push(
          createElement(View, { key: `rule-${index}`, style: styles.rule }),
        );
        return;
      }

      const style =
        block.kind === "h1"
          ? styles.h1
          : block.kind === "h2"
            ? styles.h2
            : block.kind === "h3"
              ? styles.h3
              : styles.paragraph;

      pageChildren.push(
        createElement(
          Text,
          { key: `${block.kind}-${index}`, style },
          block.text,
        ),
      );
    });

    const documentProps: { title: string; author?: string } = {
      title: options?.title || "Manuscript",
    };
    if (options?.author) {
      documentProps.author = options.author;
    }

    const documentNode = createElement(
      PdfDocument,
      documentProps,
      createElement(
        Page,
        { size: "A4", style: styles.page, wrap: true },
        ...pageChildren,
      ),
    ) as ReactElement;

    return await pdf(documentNode).toBlob();
  }

  private parseMarkdownToPdfBlocks(
    markdown: string,
  ): Array<
    | { kind: "h1" | "h2" | "h3"; text: string }
    | { kind: "paragraph"; text: string }
    | { kind: "rule" }
  > {
    const blocks: Array<
      | { kind: "h1" | "h2" | "h3"; text: string }
      | { kind: "paragraph"; text: string }
      | { kind: "rule" }
    > = [];
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length === 0) return;
      const text = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
      if (text.length > 0) {
        blocks.push({ kind: "paragraph", text });
      }
      paragraphBuffer = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        return;
      }

      if (trimmed === "---" || trimmed === "***") {
        flushParagraph();
        blocks.push({ kind: "rule" });
        return;
      }

      if (trimmed.startsWith("### ")) {
        flushParagraph();
        blocks.push({ kind: "h3", text: trimmed.slice(4).trim() });
        return;
      }

      if (trimmed.startsWith("## ")) {
        flushParagraph();
        blocks.push({ kind: "h2", text: trimmed.slice(3).trim() });
        return;
      }

      if (trimmed.startsWith("# ")) {
        flushParagraph();
        blocks.push({ kind: "h1", text: trimmed.slice(2).trim() });
        return;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        paragraphBuffer.push(`• ${trimmed.replace(/^[-*]\s+/, "")}`);
        return;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        paragraphBuffer.push(trimmed.replace(/^\d+\.\s+/, ""));
        return;
      }

      if (trimmed.startsWith(">")) {
        paragraphBuffer.push(trimmed.replace(/^>\s?/, ""));
        return;
      }

      paragraphBuffer.push(trimmed);
    });

    flushParagraph();
    return blocks;
  }

  /**
   * Export to DOCX (Microsoft Word format)
   * Generates a properly formatted Word document
   */
  async exportToDOCX(
    projectId: string,
    options?: ExportOptions,
  ): Promise<Blob> {
    const { nodes, scenes } = await this.getNodesAndScenes(projectId);

    const children: Paragraph[] = [];

    // Title page
    if (options?.title) {
      children.push(
        new Paragraph({
          text: options.title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      );
    }
    if (options?.author) {
      children.push(
        new Paragraph({
          text: `By ${options.author}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        }),
      );
    }
    if (options?.title || options?.author) {
      // Page break after title page
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Table of contents (basic)
    if (options?.includeTOC) {
      children.push(
        new Paragraph({
          text: "Table of Contents",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 },
        }),
      );
      const acts = nodes.filter((n) => n.type === "act");
      for (const act of acts) {
        children.push(new Paragraph({ text: act.title, bullet: { level: 0 } }));
        const chapters = nodes.filter(
          (n) => n.parentId === act.id && n.type === "chapter",
        );
        for (const chapter of chapters) {
          children.push(
            new Paragraph({ text: chapter.title, bullet: { level: 1 } }),
          );
        }
      }
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Content: Acts -> Chapters -> Scenes
    const acts = nodes.filter((n) => n.type === "act");
    for (const act of acts) {
      children.push(
        new Paragraph({
          text: act.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
      );

      const chapters = nodes.filter(
        (n) => n.parentId === act.id && n.type === "chapter",
      );
      for (const chapter of chapters) {
        children.push(
          new Paragraph({
            text: chapter.title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
        );

        const chapterScenes = scenes.filter((n) => n.parentId === chapter.id);
        for (const scene of chapterScenes) {
          // Scene title
          children.push(
            new Paragraph({
              text: scene.title,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
            }),
          );

          // Summary (if enabled and exists)
          if (options?.includeSummaries && scene.summary) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: scene.summary,
                    italics: true,
                    color: "666666",
                  }),
                ],
                spacing: { after: 200 },
              }),
            );
          }

          // Scene content - split by paragraphs
          const sceneText = extractTextFromTiptapJSON(scene.content);
          const paragraphs = sceneText.split(/\n\n+/).filter((p) => p.trim());
          for (const para of paragraphs) {
            children.push(
              new Paragraph({
                children: [new TextRun(para.trim())],
                spacing: { after: 200 },
              }),
            );
          }
        }

        // Page break between chapters
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Export to Markdown
   * Fully implemented - generates markdown formatted document
   */
  async exportToMarkdown(
    projectId: string,
    options?: ExportOptions,
  ): Promise<string> {
    const { nodes, scenes } = await this.getNodesAndScenes(projectId);

    const parts: string[] = [];

    // Title and metadata
    if (options?.title) {
      parts.push(`# ${options.title}\n`);
    }
    if (options?.author) {
      parts.push(`**By ${options.author}**\n`);
    }

    // Table of contents
    if (options?.includeTOC) {
      parts.push("## Table of Contents\n");
      const acts = nodes.filter((n) => n.type === "act");
      acts.forEach((act) => {
        parts.push(`- ${act.title}`);
        const chapters = nodes.filter(
          (n) => n.parentId === act.id && n.type === "chapter",
        );
        chapters.forEach((chapter) => {
          parts.push(`  - ${chapter.title}`);
          const chapterScenes = nodes.filter(
            (n) => n.parentId === chapter.id && n.type === "scene",
          );
          chapterScenes.forEach((scene) => {
            parts.push(`    - ${scene.title}`);
          });
        });
      });
      parts.push("\n---\n");
    }

    // Statistics
    if (options?.includeStats) {
      const totalWords = scenes.reduce((sum, scene) => {
        const text = extractTextFromTiptapJSON(scene.content);
        return sum + text.split(/\s+/).filter((w) => w.length > 0).length;
      }, 0);
      parts.push(
        `**Total Word Count:** ${totalWords.toLocaleString()} words\n`,
      );
      parts.push(`**Total Scenes:** ${scenes.length}\n\n---\n`);
    }

    // Content
    const acts = nodes.filter((n) => n.type === "act");
    acts.forEach((act) => {
      parts.push(`\n# ${act.title}\n`);

      const chapters = nodes.filter(
        (n) => n.parentId === act.id && n.type === "chapter",
      );
      chapters.forEach((chapter) => {
        parts.push(`\n## ${chapter.title}\n`);

        const chapterScenes = scenes.filter((n) => n.parentId === chapter.id);
        chapterScenes.forEach((scene) => {
          parts.push(`\n### ${scene.title}\n`);

          if (options?.includeSummaries && scene.summary) {
            parts.push(`> ${scene.summary}\n`);
          }

          const sceneText = extractTextFromTiptapJSON(scene.content);
          parts.push(`${sceneText}\n`);
        });
      });
    });

    return parts.join("\n");
  }

  // ===== NEW: Template-Based Export Methods =====

  /**
   * Export with a preset template configuration
   */
  async exportWithPreset(
    projectId: string,
    preset: import("@/domain/types/export-types").ExportPreset,
    customConfig?: Partial<import("@/domain/types/export-types").ExportConfig>,
  ): Promise<Blob> {
    const config = { ...preset.config, ...customConfig };

    switch (preset.defaultFormat) {
      case "docx":
        return this.exportToDOCXWithConfig(projectId, config);
      case "pdf":
        return this.exportToPDFWithConfig(projectId, config);
      case "epub":
        return this.exportToEpub();
      case "markdown":
        const markdown = await this.exportToMarkdownWithConfig(
          projectId,
          config,
        );
        return new Blob([markdown], { type: "text/markdown" });
      default:
        throw new Error(`Unsupported format: ${preset.defaultFormat}`);
    }
  }

  /**
   * Export to ePub format
   *
   * @deprecated Use useDocumentExport hook for ePub export, which calls the Rust backend
   * with a native file save dialog.
   */
  async exportToEpub(): Promise<Blob> {
    throw new Error(
      "ePub export should be called via useDocumentExport hook, " +
        "which uses native file save dialog and Rust backend.",
    );
  }

  /**
   * Generate preview pages for live preview
   */
  async generatePreview(
    projectId: string,
    preset: import("@/domain/types/export-types").ExportPreset,
    customConfig?: Partial<import("@/domain/types/export-types").ExportConfig>,
  ): Promise<import("@/domain/types/export-types").PreviewPage[]> {
    const config = { ...preset.config, ...customConfig };
    const { nodes, scenes } = await this.getNodesAndScenes(projectId);

    // Generate HTML preview pages
    return this.buildPreviewPages(nodes, scenes, config);
  }

  /**
   * Get available built-in export presets
   */
  getPresets(): import("@/domain/types/export-types").ExportPreset[] {
    return BUILT_IN_PRESETS;
  }

  // ===== Helper Methods for New Exports =====

  /**
   * Export to DOCX with custom configuration
   */
  private async exportToDOCXWithConfig(
    projectId: string,
    config: import("@/domain/types/export-types").ExportConfig,
  ): Promise<Blob> {
    const { nodes, scenes } = await this.getNodesAndScenes(projectId);

    // Helper to convert mm to twips (1 mm approx 56.6929 twips)
    const mmToTwip = (mm: number) => Math.round(mm * 56.6929);

    const children: Paragraph[] = [];

    // Title page
    if (config.epubMetadata?.title) {
      children.push(
        new Paragraph({
          text: config.epubMetadata.title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      );
    }
    if (config.epubMetadata?.author) {
      children.push(
        new Paragraph({
          text: `By ${config.epubMetadata.author}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        }),
      );
    }
    if (config.epubMetadata?.title || config.epubMetadata?.author) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Table of contents
    if (config.includeTOC) {
      children.push(
        new Paragraph({
          text: "Table of Contents",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 },
        }),
      );
      const acts = nodes.filter((n) => n.type === "act");
      for (const act of acts) {
        children.push(new Paragraph({ text: act.title, bullet: { level: 0 } }));
        const chapters = nodes.filter(
          (n) => n.parentId === act.id && n.type === "chapter",
        );
        for (const chapter of chapters) {
          children.push(
            new Paragraph({ text: chapter.title, bullet: { level: 1 } }),
          );
        }
      }
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Content
    const acts = nodes.filter((n) => n.type === "act");
    for (const act of acts) {
      children.push(
        new Paragraph({
          text: act.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
      );

      const chapters = nodes.filter(
        (n) => n.parentId === act.id && n.type === "chapter",
      );
      for (const chapter of chapters) {
        children.push(
          new Paragraph({
            text: chapter.title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
        );

        const chapterScenes = scenes.filter((n) => n.parentId === chapter.id);
        for (const scene of chapterScenes) {
          children.push(
            new Paragraph({
              text: scene.title,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
            }),
          );

          const sceneText = extractTextFromTiptapJSON(scene.content);
          const paragraphs = sceneText.split(/\n\n+/).filter((p) => p.trim());
          for (const para of paragraphs) {
            children.push(
              new Paragraph({
                children: [new TextRun(para.trim())],
                spacing: { after: 200 },
              }),
            );
          }
        }
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              ...(config.margins
                ? {
                    margin: {
                      top: mmToTwip(config.margins.top),
                      right: mmToTwip(config.margins.right),
                      bottom: mmToTwip(config.margins.bottom),
                      left: mmToTwip(config.margins.left),
                    },
                  }
                : {}),
              ...(config.pageSize
                ? {
                    size: {
                      width: mmToTwip(config.pageSize.width),
                      height: mmToTwip(config.pageSize.height),
                    },
                  }
                : {}),
            },
          },
          children,
        },
      ],
      styles: {
        default: {
          document: {
            run: {
              font: config.fontFamily || "Times New Roman",
              size: config.fontSize ? config.fontSize * 2 : 24,
            },
            paragraph: {
              spacing: {
                line: config.lineHeight ? config.lineHeight * 240 : 360,
              },
              alignment:
                config.alignment === "justify"
                  ? AlignmentType.JUSTIFIED
                  : config.alignment === "center"
                    ? AlignmentType.CENTER
                    : config.alignment === "right"
                      ? AlignmentType.RIGHT
                      : AlignmentType.LEFT,
            },
          },
        },
      },
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Export to PDF with custom configuration
   */
  private async exportToPDFWithConfig(
    projectId: string,
    config: import("@/domain/types/export-types").ExportConfig,
  ): Promise<Blob> {
    const options: ExportOptions = {};
    if (config.includeTOC !== undefined) options.includeTOC = config.includeTOC;
    if (config.epubMetadata?.title !== undefined)
      options.title = config.epubMetadata.title;
    if (config.epubMetadata?.author !== undefined)
      options.author = config.epubMetadata.author;
    return this.exportToPDF(projectId, options);
  }

  /**
   * Export to Markdown with custom configuration
   */
  private async exportToMarkdownWithConfig(
    projectId: string,
    config: import("@/domain/types/export-types").ExportConfig,
  ): Promise<string> {
    const options: ExportOptions = { includeStats: true };
    if (config.includeTOC !== undefined) options.includeTOC = config.includeTOC;
    if (config.epubMetadata?.title !== undefined)
      options.title = config.epubMetadata.title;
    if (config.epubMetadata?.author !== undefined)
      options.author = config.epubMetadata.author;
    return this.exportToMarkdown(projectId, options);
  }

  /**
   * Build chapters array for ePub
   * NOTE: Currently unused - will be used when Tauri ePub export is fully integrated
   */
  /*
    private buildEpubChapters(
        nodes: DocumentNode[],
        scenes: Scene[],
        config: import('@/domain/types/export-types').ExportConfig
    ): { title: string; data: string }[] {
        const chapters: { title: string; data: string }[] = [];

        // Add front matter
        if (config.frontMatter?.titlePage) {
            chapters.push({
                title: 'Title Page',
                data: `<h1 style="text-align: center; margin-top: 30%;">${config.epubMetadata?.title || 'Untitled'}</h1>
                    <p style="text-align: center;">by ${config.epubMetadata?.author || 'Unknown'}</p>`,
            });
        }

        if (config.frontMatter?.copyright) {
            const copyright = this.processTemplateVariables(config.frontMatter.copyright, config);
            chapters.push({
                title: 'Copyright',
                data: `<p>${copyright.replace(/\n/g, '<br>')}</p>`,
            });
        }

        if (config.frontMatter?.dedication) {
            chapters.push({
                title: 'Dedication',
                data: `<p style="font-style: italic;">${config.frontMatter.dedication}</p>`,
            });
        }

        // Add main content
        const acts = nodes.filter(n => n.type === 'act');
        acts.forEach(act => {
            const chapters_in_act = nodes.filter(n => n.parentId === act.id && n.type === 'chapter');
            chapters_in_act.forEach(chapter => {
                const chapterScenes = scenes.filter(n => n.parentId === chapter.id);
                const chapterContent = chapterScenes.map(scene => {
                    const text = extractTextFromTiptapJSON(scene.content);
                    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
                    return paragraphs.map(p => `<p>${p}</p>`).join('\n');
                }).join(`\n<p class="scene-break">***</p>\n`);

                chapters.push({
                    title: chapter.title,
                    data: chapterContent,
                });
            });
        });

        // Add back matter
        if (config.backMatter?.authorBio) {
            chapters.push({
                title: 'About the Author',
                data: `<p>${config.backMatter.authorBio}</p>`,
            });
        }

        if (config.backMatter?.acknowledgments) {
            chapters.push({
                title: 'Acknowledgments',
                data: `<p>${config.backMatter.acknowledgments}</p>`,
            });
        }

        return chapters;
    }
    */

  /**
   * Build preview pages for live preview
   */
  private buildPreviewPages(
    nodes: DocumentNode[],
    scenes: Scene[],
    config: import("@/domain/types/export-types").ExportConfig,
  ): import("@/domain/types/export-types").PreviewPage[] {
    const pages: import("@/domain/types/export-types").PreviewPage[] = [];
    let pageNumber = 1;

    // Generate simple HTML preview
    // For now, create one preview page per chapter
    const acts = nodes.filter((n) => n.type === "act");
    acts.forEach((act) => {
      const chapters = nodes.filter(
        (n) => n.parentId === act.id && n.type === "chapter",
      );
      chapters.forEach((chapter) => {
        const chapterScenes = scenes.filter((n) => n.parentId === chapter.id);
        const content = `
                    <div style="font-family: ${config.fontFamily || "Georgia"}; font-size: ${config.fontSize || 12}pt; line-height: ${config.lineHeight || 1.6};">
                        <h2>${chapter.title}</h2>
                        ${chapterScenes
                          .map((scene) => {
                            const text = extractTextFromTiptapJSON(
                              scene.content,
                            );
                            return `<div>${text
                              .split("\n\n")
                              .map((p) => `<p>${p}</p>`)
                              .join("")}</div>`;
                          })
                          .join("<hr>")}
                    </div>
                `;

        const page: import("@/domain/types/export-types").PreviewPage = {
          pageNumber: pageNumber++,
          content,
        };
        if (config.pageSize?.width !== undefined)
          page.width = config.pageSize.width;
        if (config.pageSize?.height !== undefined)
          page.height = config.pageSize.height;
        pages.push(page);
      });
    });

    return pages;
  }

  /**
   * Process template variables in text
   */
  /*
    private processTemplateVariables(
        text: string,
        config: import('@/domain/types/export-types').ExportConfig
    ): string {
        return text
            .replace(/\{\{title\}\}/g, config.epubMetadata?.title || 'Untitled')
            .replace(/\{\{author\}\}/g, config.epubMetadata?.author || 'Unknown')
            .replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    }
    */
}
