import { create } from 'zustand';

export type ViewMode = 'plan' | 'write' | 'chat' | 'review';

interface ProjectState {
    activeSceneId: string | null;
    setActiveSceneId: (id: string | null) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    activeSceneId: null,
    setActiveSceneId: (id) => set({ activeSceneId: id }),
    viewMode: 'write',
    setViewMode: (mode) => set({ viewMode: mode }),
}));
