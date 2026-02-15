/**
 * ErrorBoundary Component Specification Tests
 *
 * SPECIFICATIONS:
 * 1. MUST catch errors thrown by child components
 * 2. MUST display fallback UI when error occurs
 * 3. MUST store crash reports for debugging
 * 4. MUST show toast notification on error
 * 5. MUST provide retry functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/features/shared/components/ErrorBoundary";

// ============================================
// Mock Dependencies
// ============================================

vi.mock("@/shared/utils/toast-service", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span data-testid="alert-icon">⚠️</span>,
  RefreshCw: () => <span data-testid="refresh-icon">🔄</span>,
  Loader2: () => <span data-testid="loader-icon">⏳</span>,
}));

import { toast } from "@/shared/utils/toast-service";

// ============================================
// Test Helpers
// ============================================

// Component that throws an error
const ThrowError = ({ error }: { error: Error }) => {
  throw error;
};

// Suppress console.error for cleaner test output
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  console.error = originalError;
});

// ============================================
// Specification Tests
// ============================================

describe("ErrorBoundary Component", () => {
  // ========================================
  // SPECIFICATION: Normal Rendering
  // ========================================

  describe("SPEC: Normal Operation", () => {
    it("MUST render children when no error", () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Hello World</div>
        </ErrorBoundary>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("MUST NOT show error UI when no error", () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>,
      );

      expect(
        screen.queryByText("Something went wrong"),
      ).not.toBeInTheDocument();
    });
  });

  // ========================================
  // SPECIFICATION: Error Catching
  // ========================================

  describe("SPEC: Error Catching", () => {
    it("MUST catch errors from child components", () => {
      const error = new Error("Test error");

      render(
        <ErrorBoundary maxRetries={0}>
          <ThrowError error={error} />
        </ErrorBoundary>,
      );

      // Should display error UI
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("MUST display error message in UI", () => {
      const error = new Error("Specific error message");

      render(
        <ErrorBoundary maxRetries={0}>
          <ThrowError error={error} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Specific error message")).toBeInTheDocument();
    });
  });

  // ========================================
  // SPECIFICATION: Fallback UI
  // ========================================

  describe("SPEC: Fallback UI", () => {
    it("MUST use custom fallback when provided", () => {
      const error = new Error("Test error");
      const customFallback = (
        <div data-testid="custom-fallback">Custom Error UI</div>
      );

      render(
        <ErrorBoundary fallback={customFallback} maxRetries={0}>
          <ThrowError error={error} />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
    });

    it("MUST show default error UI when no fallback provided", () => {
      const error = new Error("Test error");

      render(
        <ErrorBoundary maxRetries={0}>
          <ThrowError error={error} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Reload Page")).toBeInTheDocument();
    });

    it("MUST show warning icon in error UI", () => {
      const error = new Error("Test error");

      render(
        <ErrorBoundary maxRetries={0}>
          <ThrowError error={error} />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });
  });

  // ========================================
  // SPECIFICATION: Error Reporting
  // ========================================

  describe("SPEC: Error Reporting", () => {
    it("MUST invoke onError callback", () => {
      const error = new Error("Crash error");
      const onError = vi.fn();

      render(
        <ErrorBoundary maxRetries={0} onError={onError}>
          <ThrowError error={error} />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalled();
    });

    it("MUST show toast notification on error", () => {
      const error = new Error("Toast error");

      render(
        <ErrorBoundary maxRetries={0}>
          <ThrowError error={error} />
        </ErrorBoundary>,
      );

      expect(toast.error).toHaveBeenCalledWith("Component failed to load", {
        description: "Please try refreshing the page.",
      });
    });
  });
});
