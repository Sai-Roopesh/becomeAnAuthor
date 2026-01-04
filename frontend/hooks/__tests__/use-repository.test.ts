/**
 * useRepository Hook Specification Tests
 *
 * SPECIFICATIONS:
 * 1. MUST provide type-safe access to repositories from DI container
 * 2. MUST support all repository types: node, project, codex, chat, backup, series
 * 3. MUST throw or handle error if repository doesn't exist
 * 4. MUST work within React component lifecycle
 *
 * This is a foundational hook that other repository hooks depend on.
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ============================================
// Mock App Context
// ============================================

const mockNodeRepository = { getByProject: vi.fn(), get: vi.fn() };
const mockProjectRepository = { getAll: vi.fn(), create: vi.fn() };
const mockCodexRepository = { search: vi.fn() };
const mockChatRepository = { getThreads: vi.fn() };

const mockServices = {
  nodeRepository: mockNodeRepository,
  projectRepository: mockProjectRepository,
  codexRepository: mockCodexRepository,
  chatRepository: mockChatRepository,
};

vi.mock("@/infrastructure/di/AppContext", () => ({
  useAppServices: () => mockServices,
}));

// Import after mocks
import { useRepository } from "../use-repository";
import { useProjectRepository } from "../use-project-repository";

// ============================================
// Wrapper for hooks that need providers
// ============================================

// Note: Since we're mocking useAppServices, we don't need a real provider

// ============================================
// Specification Tests
// ============================================

describe("useRepository Hook Specifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // SPECIFICATION 1: Type-Safe Repository Access
  // ========================================

  describe("SPEC: Type-Safe Access - MUST return correct repository", () => {
    it("MUST return nodeRepository when requested", () => {
      const { result } = renderHook(() => useRepository("nodeRepository"));

      expect(result.current).toBe(mockNodeRepository);
    });

    it("MUST return projectRepository when requested", () => {
      const { result } = renderHook(() => useRepository("projectRepository"));

      expect(result.current).toBe(mockProjectRepository);
    });

    it("MUST return codexRepository when requested", () => {
      const { result } = renderHook(() => useRepository("codexRepository"));

      expect(result.current).toBe(mockCodexRepository);
    });

    it("MUST return chatRepository when requested", () => {
      const { result } = renderHook(() => useRepository("chatRepository"));

      expect(result.current).toBe(mockChatRepository);
    });
  });

  // ========================================
  // SPECIFICATION 2: Generic Type Parameter
  // ========================================

  describe("SPEC: Generic Type - MUST preserve type information", () => {
    it("Repository methods MUST be accessible on returned instance", () => {
      const { result } = renderHook(() =>
        useRepository<typeof mockNodeRepository>("nodeRepository"),
      );

      // These calls verify the type is correct (would fail TypeScript if wrong)
      expect(result.current.getByProject).toBeDefined();
      expect(result.current.get).toBeDefined();
      expect(typeof result.current.getByProject).toBe("function");
    });
  });

  // ========================================
  // SPECIFICATION 3: Stable Reference
  // ========================================

  describe("SPEC: Stable Reference - MUST return same instance", () => {
    it("Same repository key MUST return same instance on re-render", () => {
      const { result, rerender } = renderHook(() =>
        useRepository("projectRepository"),
      );

      const first = result.current;

      rerender();

      const second = result.current;

      expect(first).toBe(second);
    });
  });
});

// ============================================
// useProjectRepository Convenience Hook Tests
// ============================================

describe("useProjectRepository Hook Specifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SPEC: Convenience Wrapper - MUST use useRepository correctly", () => {
    it("MUST return project repository", () => {
      const { result } = renderHook(() => useProjectRepository());

      expect(result.current).toBe(mockProjectRepository);
    });

    it("MUST have expected IProjectRepository interface", () => {
      const { result } = renderHook(() => useProjectRepository());

      // Verify interface matches expected repository contract
      expect(result.current.getAll).toBeDefined();
      expect(result.current.create).toBeDefined();
    });
  });
});

// ============================================
// Edge Cases and Error Handling
// ============================================

describe("Repository Hooks Edge Cases", () => {
  it("Hook MUST work in strict mode (double render)", () => {
    const StrictModeWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children);

    const { result } = renderHook(() => useProjectRepository(), {
      wrapper: StrictModeWrapper,
    });

    expect(result.current).toBeDefined();
    expect(result.current).toBe(mockProjectRepository);
  });
});
