/**
 * VersionWarning Component Specification Tests
 *
 * SPECIFICATIONS:
 * 1. MUST show how long ago analysis was done
 * 2. MUST show number of scenes edited since analysis
 * 3. MUST suggest running new analysis
 * 4. MUST use correct singular/plural for "scene(s)"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { VersionWarning } from "../VersionWarning";

// ============================================
// Mock Dependencies
// ============================================

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: React.PropsWithChildren) => (
    <div data-testid="alert" role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: React.PropsWithChildren) => (
    <p data-testid="alert-description">{children}</p>
  ),
}));

vi.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="alert-icon">⚠️</span>,
}));

// ============================================
// Test Helpers
// ============================================

const DAY_MS = 1000 * 60 * 60 * 24;

// ============================================
// Specification Tests
// ============================================

describe("VersionWarning Component", () => {
  const realDateNow = Date.now;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now to return a fixed timestamp
    Date.now = vi.fn(() => 1703203200000); // 2023-12-22
  });

  afterEach(() => {
    Date.now = realDateNow;
  });

  // ========================================
  // SPECIFICATION: Time Ago Display
  // ========================================

  describe("SPEC: Time Ago Display", () => {
    it('MUST show "today" when analyzed today', () => {
      const now = 1703203200000;
      Date.now = vi.fn(() => now);

      render(<VersionWarning lastAnalyzed={now - 1000} scenesEdited={0} />);

      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });

    it('MUST show "yesterday" when analyzed 1 day ago', () => {
      const now = 1703203200000;
      Date.now = vi.fn(() => now);

      render(<VersionWarning lastAnalyzed={now - DAY_MS} scenesEdited={0} />);

      expect(screen.getByText(/yesterday/i)).toBeInTheDocument();
    });

    it('MUST show "X days ago" when analyzed multiple days ago', () => {
      const now = 1703203200000;
      Date.now = vi.fn(() => now);

      render(
        <VersionWarning lastAnalyzed={now - DAY_MS * 5} scenesEdited={0} />,
      );

      expect(screen.getByText(/5 days ago/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // SPECIFICATION: Scenes Edited Count
  // ========================================

  describe("SPEC: Scenes Edited", () => {
    it('MUST show singular "scene" when 1 edited', () => {
      render(<VersionWarning lastAnalyzed={Date.now()} scenesEdited={1} />);

      expect(screen.getByText(/1 scene edited/i)).toBeInTheDocument();
    });

    it('MUST show plural "scenes" when multiple edited', () => {
      render(<VersionWarning lastAnalyzed={Date.now()} scenesEdited={5} />);

      expect(screen.getByText(/5 scenes edited/i)).toBeInTheDocument();
    });

    it('MUST show plural "scenes" when 0 edited', () => {
      render(<VersionWarning lastAnalyzed={Date.now()} scenesEdited={0} />);

      expect(screen.getByText(/0 scenes edited/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // SPECIFICATION: Recommendation
  // ========================================

  describe("SPEC: Analysis Recommendation", () => {
    it("MUST suggest running new analysis", () => {
      render(<VersionWarning lastAnalyzed={Date.now()} scenesEdited={3} />);

      expect(
        screen.getByText(/consider running a new analysis/i),
      ).toBeInTheDocument();
    });
  });

  // ========================================
  // SPECIFICATION: Visual Elements
  // ========================================

  describe("SPEC: Visual Elements", () => {
    it("MUST show alert icon", () => {
      render(<VersionWarning lastAnalyzed={Date.now()} scenesEdited={0} />);

      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });

    it("MUST render as an alert", () => {
      render(<VersionWarning lastAnalyzed={Date.now()} scenesEdited={0} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
