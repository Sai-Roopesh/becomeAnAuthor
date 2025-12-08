/**
 * Zustand store for editor UI state
 * Manages menu visibility, focus mode, and other UI state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface EditorUIState {
    // Menu visibility
    showLeftPanel: boolean;
    showRightPanel: boolean;
    showBottomPanel: boolean;

    // Focus mode
    focusMode: boolean;

    // Active menus
    activeMenu: string | null;

    // Actions
    toggleLeftPanel: () => void;
    toggleRightPanel: () => void;
    toggleBottomPanel: () => void;
    toggleFocusMode: () => void;
    setActiveMenu: (menu: string | null) => void;
    reset: () => void;
}

const initialState = {
    showLeftPanel: true,
    showRightPanel: true,
    showBottomPanel: false,
    focusMode: false,
    activeMenu: null,
};

export const useEditorUIStore = create<EditorUIState>()(
    devtools(
        persist(
            (set) => ({
                ...initialState,

                toggleLeftPanel: () => set((state) => ({
                    showLeftPanel: !state.showLeftPanel
                })),

                toggleRightPanel: () => set((state) => ({
                    showRightPanel: !state.showRightPanel
                })),

                toggleBottomPanel: () => set((state) => ({
                    showBottomPanel: !state.showBottomPanel
                })),

                toggleFocusMode: () => set((state) => {
                    const newFocusMode = !state.focusMode;
                    return {
                        focusMode: newFocusMode,
                        showLeftPanel: !newFocusMode,
                        showRightPanel: !newFocusMode,
                        showBottomPanel: false,
                    };
                }),

                setActiveMenu: (menu) => set({ activeMenu: menu }),

                reset: () => set(initialState),
            }),
            {
                name: 'editor-ui-storage',
                partialize: (state) => ({
                    showLeftPanel: state.showLeftPanel,
                    showRightPanel: state.showRightPanel,
                    focusMode: state.focusMode,
                }),
            }
        ),
        { name: 'EditorUI' }
    )
);
