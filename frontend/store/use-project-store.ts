/**
 * Project Store
 * Manages project-level UI state: active scene, view mode, panel visibility
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "plan" | "write" | "chat";

/** Right panel tabs in Write mode */
export type RightPanelTab = "timeline" | "notes";

/** Left sidebar tabs */
export type LeftSidebarTab = "manuscript" | "codex" | "snippets";

export interface ProjectStore {
  activeSceneId: string | null;
  setActiveSceneId: (id: string | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  activeCodexEntryId: string | null;
  setActiveCodexEntryId: (id: string | null) => void;
  // Panel visibility (collapsible)
  showSidebar: boolean;
  showTimeline: boolean;
  toggleSidebar: () => void;
  toggleTimeline: () => void;
  setShowSidebar: (show: boolean) => void;
  setShowTimeline: (show: boolean) => void;
  // Right panel tab state (Phase 0)
  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;
  // Left sidebar tab state (Phase 0)
  leftSidebarTab: LeftSidebarTab;
  setLeftSidebarTab: (tab: LeftSidebarTab) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      activeSceneId: null,
      viewMode: "plan",
      activeProjectId: null,
      activeCodexEntryId: null,
      showSidebar: true,
      showTimeline: true,
      rightPanelTab: "timeline",
      leftSidebarTab: "manuscript",

      setViewMode: (viewMode) => set({ viewMode }),

      toggleSidebar: () =>
        set((state) => ({ showSidebar: !state.showSidebar })),
      toggleTimeline: () =>
        set((state) => ({ showTimeline: !state.showTimeline })),
      setShowSidebar: (show) => set({ showSidebar: show }),
      setShowTimeline: (show) => set({ showTimeline: show }),

      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),

      setActiveSceneId: (id) => {
        set({ activeSceneId: id });
      },

      setActiveProjectId: (id) => set({ activeProjectId: id }),
      setActiveCodexEntryId: (id) => set({ activeCodexEntryId: id }),
    }),
    {
      name: "project-store",
      partialize: (state) => ({
        showSidebar: state.showSidebar,
        showTimeline: state.showTimeline,
        rightPanelTab: state.rightPanelTab,
        leftSidebarTab: state.leftSidebarTab,
      }),
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState as
          | Partial<ProjectStore>
          | undefined;
        const persistedRightTab = typedPersisted?.rightPanelTab;
        const rightPanelTab: RightPanelTab =
          persistedRightTab === "timeline" || persistedRightTab === "notes"
            ? persistedRightTab
            : "timeline";

        return {
          ...currentState,
          ...(typedPersisted || {}),
          rightPanelTab,
        };
      },
    },
  ),
);
