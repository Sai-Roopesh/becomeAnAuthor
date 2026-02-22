import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SceneLinkPanel } from "../scene-link-panel";

const mockLinkRepo = {
  getByScene: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockCodexRepo = {
  getBySeries: vi.fn(),
};

const mockNodeRepo = {
  get: vi.fn(),
};

const mockSetViewMode = vi.fn();
const mockSetLeftSidebarTab = vi.fn();
const mockSetShowSidebar = vi.fn();

vi.mock("@/infrastructure/di/AppContext", () => ({
  useAppServices: () => ({
    sceneCodexLinkRepository: mockLinkRepo,
    codexRepository: mockCodexRepo,
    nodeRepository: mockNodeRepo,
  }),
}));

vi.mock("@/store/use-project-store", () => ({
  useProjectStore: () => ({
    setViewMode: mockSetViewMode,
    setLeftSidebarTab: mockSetLeftSidebarTab,
    setShowSidebar: mockSetShowSidebar,
  }),
}));

vi.mock("@/hooks/use-live-query", () => ({
  useLiveQuery: (queryFn: () => unknown) => queryFn(),
}));

vi.mock("@/shared/utils/toast-service", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: React.PropsWithChildren) => (
    <div data-testid="sheet">{children}</div>
  ),
  SheetContent: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  SheetTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    id,
    value,
    placeholder,
    onChange,
    disabled,
  }: {
    id?: string;
    value?: string;
    placeholder?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
  }) => (
    <input
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      disabled={disabled}
    />
  ),
}));

vi.mock("lucide-react", () => ({
  User: () => <span>User</span>,
  MapPin: () => <span>MapPin</span>,
  Scroll: () => <span>Scroll</span>,
  BookOpen: () => <span>BookOpen</span>,
  Sparkles: () => <span>Sparkles</span>,
  Plus: () => <span>Plus</span>,
  X: () => <span>X</span>,
  Link2: () => <span>Link2</span>,
  Check: () => <span>Check</span>,
  Lightbulb: () => <span>Lightbulb</span>,
  Info: () => <span>Info</span>,
  Loader2: () => <span>Loader</span>,
  ArrowRight: () => <span>ArrowRight</span>,
}));

function renderPanel(overrideEntries: unknown[] = []) {
  mockLinkRepo.getByScene.mockReturnValue([]);
  mockCodexRepo.getBySeries.mockReturnValue(
    overrideEntries.length > 0
      ? overrideEntries
      : [
          {
            id: "codex-1",
            name: "Alice",
            aliases: ["Al"],
            category: "character",
          },
          {
            id: "codex-2",
            name: "Harbor",
            aliases: [],
            category: "location",
          },
        ],
  );

  mockNodeRepo.get.mockReturnValue({
    id: "scene-1",
    type: "scene",
    title: "Arrival",
    summary: "Alice arrives at Harbor",
    pov: "Alice",
    labels: ["intro"],
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "mention", attrs: { id: "codex-1" } }],
        },
      ],
    },
  });

  return render(
    <SceneLinkPanel
      sceneId="scene-1"
      projectId="project-1"
      seriesId="series-1"
      open
      onOpenChange={vi.fn()}
    />,
  );
}

describe("SceneLinkPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLinkRepo.create.mockResolvedValue({ id: "new-link" });
    mockLinkRepo.update.mockResolvedValue(undefined);
    mockLinkRepo.delete.mockResolvedValue(undefined);
  });

  it("shows onboarding guidance and keyboard shortcut hints", () => {
    renderPanel();

    expect(screen.getByText("How to use this effectively")).toBeInTheDocument();
    expect(screen.getByText(/Cmd\/Ctrl \+ F/)).toBeInTheDocument();
    expect(screen.getByText(/Cmd\/Ctrl \+ Shift \+ L/)).toBeInTheDocument();
  });

  it("links detected mentions via CTA", async () => {
    renderPanel();

    expect(screen.getByText("Detected @mentions (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Link @mentions" }));

    await waitFor(() => {
      expect(mockLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          codexId: "codex-1",
          autoDetected: true,
        }),
      );
    });
  });

  it("links detected mentions via keyboard shortcut", async () => {
    renderPanel();

    fireEvent.keyDown(window, { key: "L", ctrlKey: true, shiftKey: true });

    await waitFor(() => {
      expect(mockLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          codexId: "codex-1",
          autoDetected: true,
        }),
      );
    });
  });

  it("focuses search via shortcut", () => {
    renderPanel();

    const searchInput = screen.getByPlaceholderText("Search codex entries...");
    searchInput.blur();

    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    expect(searchInput).toHaveFocus();
  });

  it("routes to Codex on empty state", () => {
    const onOpenChange = vi.fn();

    mockLinkRepo.getByScene.mockReturnValue([]);
    mockCodexRepo.getBySeries.mockReturnValue([]);
    mockNodeRepo.get.mockReturnValue({
      id: "scene-1",
      type: "scene",
      title: "Arrival",
      content: { type: "doc", content: [] },
    });

    render(
      <SceneLinkPanel
        sceneId="scene-1"
        projectId="project-1"
        seriesId="series-1"
        open
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Open Codex Workspace/ }),
    );

    expect(mockSetViewMode).toHaveBeenCalledWith("write");
    expect(mockSetLeftSidebarTab).toHaveBeenCalledWith("codex");
    expect(mockSetShowSidebar).toHaveBeenCalledWith(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
