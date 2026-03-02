/**
 * Project Store
 * Manages project-level UI state: active scene, view mode, panel visibility
 */

import { create } from "zustand";

export type ViewMode = "plan" | "write" | "chat";

/** Right panel tabs in Write mode */
export type RightPanelTab = "timeline" | "notes";

/** Left sidebar tabs */
export type LeftSidebarTab = "manuscript" | "codex" | "snippets";

export interface ProjectStorePersistenceState {
  showSidebar: boolean;
  showTimeline: boolean;
  rightPanelTab: RightPanelTab;
  leftSidebarTab: LeftSidebarTab;
}

export interface ProjectStore extends ProjectStorePersistenceState {
  activeSceneId: string | null;
  setActiveSceneId: (id: string | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  activeCodexEntryId: string | null;
  setActiveCodexEntryId: (id: string | null) => void;
  // Panel visibility (collapsible)
  toggleSidebar: () => void;
  toggleTimeline: () => void;
  setShowSidebar: (show: boolean) => void;
  setShowTimeline: (show: boolean) => void;
  // Right panel tab state (Phase 0)
  setRightPanelTab: (tab: RightPanelTab) => void;
  // Left sidebar tab state (Phase 0)
  setLeftSidebarTab: (tab: LeftSidebarTab) => void;
}

export const defaultProjectStorePersistenceState: ProjectStorePersistenceState =
  {
    showSidebar: true,
    showTimeline: true,
    rightPanelTab: "timeline",
    leftSidebarTab: "manuscript",
  };

export const useProjectStore = create<ProjectStore>()((set) => ({
  activeSceneId: null,
  viewMode: "plan",
  activeProjectId: null,
  activeCodexEntryId: null,
  ...defaultProjectStorePersistenceState,

  setViewMode: (viewMode) => set({ viewMode }),

  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  toggleTimeline: () => set((state) => ({ showTimeline: !state.showTimeline })),
  setShowSidebar: (show) => set({ showSidebar: show }),
  setShowTimeline: (show) => set({ showTimeline: show }),

  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),

  setActiveSceneId: (id) => {
    set({ activeSceneId: id });
  },

  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setActiveCodexEntryId: (id) => set({ activeCodexEntryId: id }),
}));

export function normalizeProjectStorePersistenceState(
  value: Partial<ProjectStorePersistenceState> | undefined,
): ProjectStorePersistenceState {
  const persistedRightTab = value?.rightPanelTab;
  const rightPanelTab: RightPanelTab =
    persistedRightTab === "timeline" || persistedRightTab === "notes"
      ? persistedRightTab
      : "timeline";

  const persistedLeftTab = value?.leftSidebarTab;
  const leftSidebarTab: LeftSidebarTab =
    persistedLeftTab === "manuscript" ||
    persistedLeftTab === "codex" ||
    persistedLeftTab === "snippets"
      ? persistedLeftTab
      : "manuscript";

  return {
    showSidebar:
      typeof value?.showSidebar === "boolean"
        ? value.showSidebar
        : defaultProjectStorePersistenceState.showSidebar,
    showTimeline:
      typeof value?.showTimeline === "boolean"
        ? value.showTimeline
        : defaultProjectStorePersistenceState.showTimeline,
    rightPanelTab,
    leftSidebarTab,
  };
}

export function selectProjectStorePersistenceState(
  state: ProjectStore,
): ProjectStorePersistenceState {
  return {
    showSidebar: state.showSidebar,
    showTimeline: state.showTimeline,
    rightPanelTab: state.rightPanelTab,
    leftSidebarTab: state.leftSidebarTab,
  };
}
