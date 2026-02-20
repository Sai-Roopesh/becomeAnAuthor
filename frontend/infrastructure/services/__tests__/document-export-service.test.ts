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

    it("MUST hydrate scene content when project listing has empty placeholders", async () => {
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

      expect(mockRepo.get).toHaveBeenCalledWith("scene-empty");
      expect(markdown).toContain("Loaded full content");
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

      const blob = await service.exportToDOCX("proj-1");

      expect(blob).toBeInstanceOf(Blob);
    });

    it("MUST set correct MIME type for Word documents", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([
        createMockAct(),
        createMockChapter(),
        createMockScene(),
      ]);

      const blob = await service.exportToDOCX("proj-1");

      expect(blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("MUST handle empty project without throwing", async () => {
      vi.mocked(mockRepo.getByProject).mockResolvedValue([]);

      await expect(service.exportToDOCX("empty-proj")).resolves.not.toThrow();
    });
  });

  // ========================================
  // SPECIFICATION: PDF Export
  // Note: PDF export uses html2canvas which requires real DOM.
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
