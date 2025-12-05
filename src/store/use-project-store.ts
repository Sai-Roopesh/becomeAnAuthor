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

            // ✅ VALIDATION: Check scene exists before setting
            setActiveSceneId: async (id) => {
                if (!id) {
                    set({ activeSceneId: null });
                    return;
                }

                // Dynamically import db to avoid circular dependency
                const { db } = await import('@/lib/core/database');
                const scene = await db.nodes.get(id);

                if (scene) {
                    set({ activeSceneId: id });
                } else {
                    // Scene doesn't exist (deleted?)
                    set({ activeSceneId: null });

                    // Optionally notify user
                    const { toast } = await import('@/lib/toast-service');
                    toast.error('Scene not found', {
                        description: 'The selected scene may have been deleted.',
                    });
                }
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

