import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Dashboard from "../page";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  permanentlyDeleteDeletedSeries: vi.fn(),
  restoreDeletedSeries: vi.fn(),
  permanentlyDeleteFromTrash: vi.fn(),
  restoreFromTrash: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock("@/hooks/use-open-project", () => ({
  useOpenProject: () => ({
    openFromPicker: vi.fn(),
    isOpening: false,
  }),
}));

vi.mock("@/hooks/use-project-repository", () => ({
  useProjectRepository: () => ({
    listTrash: vi.fn(),
    restoreFromTrash: mocks.restoreFromTrash,
    permanentlyDeleteFromTrash: mocks.permanentlyDeleteFromTrash,
  }),
}));

vi.mock("@/hooks/use-live-query", () => ({
  invalidateQueries: vi.fn(),
  useLiveQuery: vi.fn(
    (_: unknown, __: unknown, options?: { keys?: string }) => {
      if (options?.keys === "projects") {
        return [
          {
            id: "project-1",
            title: "Novel in Trash",
            originalPath: "/projects/novel-in-trash",
            trashPath: "/trash/novel-in-trash",
            deletedAt: 1769011200000,
          },
        ];
      }

      if (options?.keys === "series") {
        return [
          {
            oldSeriesId: "series-old-1",
            title: "The lord",
            deletedAt: 1769011200000,
          },
        ];
      }

      return [];
    },
  ),
}));

vi.mock("@/core/tauri", () => ({
  listDeletedSeries: vi.fn(),
  permanentlyDeleteDeletedSeries: mocks.permanentlyDeleteDeletedSeries,
  restoreDeletedSeries: mocks.restoreDeletedSeries,
}));

vi.mock("@/hooks/use-confirmation", () => ({
  useConfirmation: () => ({
    confirm: mocks.confirm,
    ConfirmationDialog: () => <div data-testid="confirmation-dialog" />,
  }),
}));

vi.mock("@/shared/utils/toast-service", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/dashboard/components/DashboardHeader", () => ({
  DashboardHeader: () => <div data-testid="dashboard-header" />,
}));

vi.mock("@/features/data-management", () => ({
  BackupCenterDialog: ({ trigger }: { trigger: React.ReactNode }) => (
    <div>{trigger}</div>
  ),
}));

vi.mock("@/features/series", () => ({
  CreateSeriesDialog: () => <div data-testid="create-series-dialog" />,
  SeriesList: () => <div data-testid="series-list" />,
}));

vi.mock("@/features/shared/components", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("Dashboard Trash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not permanently delete deleted series when confirmation is canceled", async () => {
    mocks.confirm.mockResolvedValueOnce(false);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /show trash/i }));

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete forever/i,
    });
    const firstDeleteButton = deleteButtons[0];
    if (!firstDeleteButton) {
      throw new Error("Expected at least one delete button");
    }
    fireEvent.click(firstDeleteButton);

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalledTimes(1);
    });
    expect(mocks.permanentlyDeleteDeletedSeries).not.toHaveBeenCalled();
  });

  it("permanently deletes deleted series only after confirmation", async () => {
    mocks.confirm.mockResolvedValueOnce(true);
    mocks.permanentlyDeleteDeletedSeries.mockResolvedValueOnce(undefined);

    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /show trash/i }));

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete forever/i,
    });
    const firstDeleteButton = deleteButtons[0];
    if (!firstDeleteButton) {
      throw new Error("Expected at least one delete button");
    }
    fireEvent.click(firstDeleteButton);

    await waitFor(() => {
      expect(mocks.permanentlyDeleteDeletedSeries).toHaveBeenCalledWith(
        "series-old-1",
      );
    });
  });
});
