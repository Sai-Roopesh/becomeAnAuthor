/**
 * Document Export Service Specification Tests
 *
 * SPECIFICATIONS (from implementation plan):
 * 1. Export MUST produce valid format for each type (PDF, DOCX, Markdown)
 * 2. Export MUST include all scenes in correct order
 * 3. Export MUST preserve formatting from Tiptap content
 * 4. Export MUST handle empty projects gracefully
 *
 * NOTE: Full integration testing of PDF export requires a real browser environment.
 * These tests focus on testable specifications.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentExportService } from "../DocumentExportService";
import type { INodeRepository } from "@/domain/repositories/INodeRepository";
import { DEFAULT_EXPORT_CONFIG } from "@/domain/types/export-types";

// ============================================
// Mock Dependencies
// ============================================

const createMockNodeRepository = (): INodeRepository => ({
  get: vi.fn(),
  getByProject: vi.fn(),
  getByParent: vi.fn(),
  getChildren: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMetadata: vi.fn(),
  delete: vi.fn(),
  deleteCascade: vi.fn(),
  bulkDelete: vi.fn(),
  getProjectPath: vi.fn().mockReturnValue("/mock/path"),
});

// ============================================
// Test Fixtures - Following actual hierarchy expectations
// ============================================

const createMockAct = (overrides = {}) => ({
  id: "act-1",
  projectId: "proj-1",
  type: "act" as const,
  title: "Act One",
  order: 0,
  parentId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  expanded: true,
  ...overrides,
});

const createMockChapter = (overrides = {}) => ({
  id: "chapter-1",
  projectId: "proj-1",
  type: "chapter" as const,
  title: "Chapter One",
  order: 0,
  parentId: "act-1",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  expanded: true,
  ...overrides,
});

const createMockScene = (overrides = {}) => ({
  id: "scene-1",
  projectId: "proj-1",
  type: "scene" as const,
  title: "Test Scene",
  order: 0,
  parentId: "chapter-1",
  content: {
    type: "doc" as const,
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
    ],
  },
  summary: "",
  status: "draft" as const,
  wordCount: 2,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  expanded: false,
  ...overrides,
});

// ============================================
// Specification Tests
// ============================================

describe("DocumentExportService Contract", () => {
  let service: DocumentExportService;
  let mockRepo: INodeRepository;
  const docxConfig = { ...DEFAULT_EXPORT_CONFIG, format: "docx" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockNodeRepository();
    service = new DocumentExportService(mockRepo);
  });

  // ========================================
  // SPECIFICATION: Constructor/Interface
  // ========================================

  describe("SPEC: Interface", () => {
    it("MUST implement exportToMarkdown method", () => {
      expect(typeof service.exportToMarkdown).toBe("function");
    });

    it("MUST implement exportToDOCX method", () => {
      expect(typeof service.exportToDOCX).toBe("function");
    });

    it("MUST implement exportToPDF method", () => {
      expect(typeof service.exportToPDF).toBe("function");
    });
  });

  // ========================================
  // SPECIFICATION: Markdown Export
  // ========================================

  describe("SPEC: exportToMarkdown", () => {
    it("MUST return string type", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([]);

      const result = await service.exportToMarkdown("proj-1");

      expect(typeof result).toBe("string");
    });

    it("MUST return empty string for project with no content", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([]);

      const markdown = await service.exportToMarkdown("empty-proj");

      expect(markdown).toBe("");
    });

    it("MUST include act titles with # prefix", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct({ title: "The Beginning" }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1");

      expect(markdown).toContain("# The Beginning");
    });

    it("MUST include chapter titles with ## prefix", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct({ id: "act-1", title: "Act One" }),
        createMockChapter({
          id: "chapter-1",
          parentId: "act-1",
          title: "Chapter One",
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1");

      expect(markdown).toContain("## Chapter One");
    });

    it("MUST include scene titles with ### prefix", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct({ id: "act-1" }),
        createMockChapter({ id: "chapter-1", parentId: "act-1" }),
        createMockScene({
          id: "scene-1",
          parentId: "chapter-1",
          title: "Opening Scene",
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1");

      expect(markdown).toContain("### Opening Scene");
    });

    it("MUST include scene content text", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct({ id: "act-1" }),
        createMockChapter({ id: "chapter-1", parentId: "act-1" }),
        createMockScene({
          id: "scene-1",
          parentId: "chapter-1",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Story content here" }],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1");

      expect(markdown).toContain("Story content here");
    });

    it("MUST preserve paragraph breaks in scene content", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct({ id: "act-1" }),
        createMockChapter({ id: "chapter-1", parentId: "act-1" }),
        createMockScene({
          id: "scene-1",
          parentId: "chapter-1",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "First paragraph." }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Second paragraph." }],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1");

      expect(markdown).toContain("First paragraph.\n\nSecond paragraph.");
    });

    it("MUST avoid secondary scene hydration lookups during export", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct({ id: "act-1" }),
        createMockChapter({ id: "chapter-1", parentId: "act-1" }),
        createMockScene({
          id: "scene-empty",
          parentId: "chapter-1",
          title: "Hydrated Scene",
          content: { type: "doc", content: [] },
        }),
      ]);

      vi.mocked(mockRepo.get).mockResolvedValue(
        createMockScene({
          id: "scene-empty",
          parentId: "chapter-1",
          title: "Hydrated Scene",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Loaded full content" }],
              },
            ],
          },
        }),
      );

      const markdown = await service.exportToMarkdown("proj-1");

      expect(mockRepo.get).not.toHaveBeenCalled();
      expect(markdown).not.toContain("Loaded full content");
    });

    it("MUST include scenes even when no acts/chapters exist", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockScene({
          id: "root-scene",
          parentId: null,
          title: "Root Scene",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Standalone scene content" }],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1");

      expect(markdown).toContain("Root Scene");
      expect(markdown).toContain("Standalone scene content");
    });

    it("MUST include codex appendix when option is enabled", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockScene({
          id: "scene-appendix",
          parentId: null,
          title: "Linked Scene",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Kola entered." },
                  {
                    type: "mention",
                    attrs: { id: "codex-1", label: "Kola" },
                  },
                ],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1", {
        includeCodexAppendix: true,
      });

      expect(markdown).toContain("## Codex Link Appendix");
      expect(markdown).toContain("Kola (1 link) - scenes: Linked Scene");
    });

    it("MUST map section titles to heading styles in markdown export", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockScene({
          id: "scene-sections",
          title: "Scene With Sections",
          content: {
            type: "doc",
            content: [
              {
                type: "section",
                attrs: { title: "Storm Setup", sectionType: "standard" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Rain hit the glass." }],
                  },
                ],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1");

      expect(markdown).toContain("#### Storm Setup");
      expect(markdown).toContain("Rain hit the glass.");
    });

    it("MUST allow hiding section headings when includeSectionTitles is false", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockScene({
          id: "scene-sections-hidden",
          title: "Scene With Sections",
          content: {
            type: "doc",
            content: [
              {
                type: "section",
                attrs: { title: "Secret Heading", sectionType: "standard" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Visible prose only." }],
                  },
                ],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1", {
        includeSectionTitles: false,
      });

      expect(markdown).not.toContain("#### Secret Heading");
      expect(markdown).toContain("Visible prose only.");
    });

    it("MUST exclude AI-flagged sections when includeExcludedSections is false", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockScene({
          id: "scene-filtered-sections",
          title: "Filtered Scene",
          content: {
            type: "doc",
            content: [
              {
                type: "section",
                attrs: {
                  title: "Visible Section",
                  sectionType: "standard",
                  excludeFromAI: false,
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Keep this section." }],
                  },
                ],
              },
              {
                type: "section",
                attrs: {
                  title: "Hidden Section",
                  sectionType: "standard",
                  excludeFromAI: true,
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Skip this section." }],
                  },
                ],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1", {
        includeExcludedSections: false,
      });

      expect(markdown).toContain("Keep this section.");
      expect(markdown).not.toContain("Skip this section.");
    });

    it("MUST include section entries in TOC when enabled", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockScene({
          id: "scene-toc-sections",
          title: "Scene Alpha",
          content: {
            type: "doc",
            content: [
              {
                type: "section",
                attrs: { title: "Section One", sectionType: "standard" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Section body." }],
                  },
                ],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1", {
        includeTOC: true,
      });

      expect(markdown).toContain("## Table of Contents");
      expect(markdown).toContain("- Scene Alpha: Section One");
    });

    it("MUST add page breaks for configured section types", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockScene({
          id: "scene-breaks",
          title: "Break Scene",
          content: {
            type: "doc",
            content: [
              {
                type: "section",
                attrs: { title: "Part 1", sectionType: "part" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Part prose." }],
                  },
                ],
              },
              {
                type: "section",
                attrs: { title: "Continuation", sectionType: "standard" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "More prose." }],
                  },
                ],
              },
            ],
          },
        }),
      ]);

      const markdown = await service.exportToMarkdown("proj-1", {
        sectionPageBreaks: {
          standard: false,
          chapter: false,
          part: true,
          appendix: false,
        },
      });

      expect(markdown).toContain("---\n\n#### Part 1");
    });
  });

  // ========================================
  // SPECIFICATION: DOCX Export
  // ========================================

  describe("SPEC: exportToDOCX", () => {
    it("MUST return a Blob", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct(),
        createMockChapter(),
        createMockScene({ content: { type: "doc", content: [] } }),
      ]);

      const blob = await service.exportToDOCX("proj-1", docxConfig);

      expect(blob).toBeInstanceOf(Blob);
    });

    it("MUST set correct MIME type for Word documents", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct(),
        createMockChapter(),
        createMockScene(),
      ]);

      const blob = await service.exportToDOCX("proj-1", docxConfig);

      expect(blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("MUST handle empty project without throwing", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([]);

      await expect(
        service.exportToDOCX("empty-proj", docxConfig),
      ).resolves.not.toThrow();
    });
  });

  // ========================================
  // SPECIFICATION: PDF Export
  // Note: PDF export uses react-pdf rendering.
  // Full testing requires integration/e2e tests.
  // ========================================

  describe.todo("SPEC: exportToPDF - Requires browser environment", () => {
    it.todo("MUST return a Blob");
    it.todo("MUST set correct MIME type for PDF");
    it.todo("MUST include all scenes in PDF");
    it.todo("MUST apply professional styling");
  });

  // ========================================
  // SPECIFICATION: Export Options
  // ========================================

  describe("SPEC: Export Options - Markdown", () => {
    it("MUST include custom title when option provided", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([]);

      const markdown = await service.exportToMarkdown("proj-1", {
        title: "My Novel",
      });

      expect(markdown).toContain("# My Novel");
    });

    it("MUST include author when option provided", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([]);

      const markdown = await service.exportToMarkdown("proj-1", {
        author: "Jane Author",
      });

      expect(markdown).toContain("Jane Author");
    });
  });
});
