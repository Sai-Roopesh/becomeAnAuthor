import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'plan' | 'write' | 'chat' | 'review';

export interface ProjectStore {
    activeSceneId: string | null;
    setActiveSceneId: (id: string | null) => Promise<void>;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    activeProjectId: string | null;
    setActiveProjectId: (id: string | null) => void;
    // Panel visibility (collapsible)
    showSidebar: boolean;
    showTimeline: boolean;
    toggleSidebar: () => void;
    toggleTimeline: () => void;
    setShowSidebar: (show: boolean) => void;
    setShowTimeline: (show: boolean) => void;
}

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set) => ({
            activeSceneId: null,
            viewMode: 'plan',
            activeProjectId: null,
            showSidebar: true,
            showTimeline: true,

            setViewMode: (viewMode) => set({ viewMode }),

            toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
            toggleTimeline: () => set((state) => ({ showTimeline: !state.showTimeline })),
            setShowSidebar: (show) => set({ showSidebar: show }),
            setShowTimeline: (show) => set({ showTimeline: show }),

            // Set active scene ID - validation happens when scene is loaded in EditorContainer
            setActiveSceneId: async (id) => {
                set({ activeSceneId: id });
            },

            setActiveProjectId: (id) => set({ activeProjectId: id }),
        }),
        {
            name: 'project-store',
            partialize: (state) => ({
                showSidebar: state.showSidebar,
                showTimeline: state.showTimeline,
            }),
        }
    )
);

