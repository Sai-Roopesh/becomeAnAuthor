import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FormatSettings {
    // Typography
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    textIndent: number;
    alignment: 'left' | 'center' | 'right' | 'justify';
    paragraphSpacing: number;
    pageWidth: number;
    sceneDividerStyle: string;

    // Writing
    continueInChapter: boolean;

    // Typewriter Mode
    typewriterMode: boolean;
    typewriterOffset: number; // Cursor position as % from top (20-60, default 40)

    // Page
    showLineNumbers: boolean;
    showWordCount: boolean;

    // Focus Mode
    focusMode: boolean;
}

interface FormatStore extends FormatSettings {
    updateSettings: (settings: Partial<FormatSettings>) => void;
    resetSettings: () => void;
    toggleFocusMode: () => void;
    toggleTypewriterMode: () => void;
}

const defaultSettings: FormatSettings = {
    fontFamily: 'Georgia',
    fontSize: 16,
    lineHeight: 1.8,
    textIndent: 0,
    alignment: 'left',
    paragraphSpacing: 1.2,
    pageWidth: 700,
    sceneDividerStyle: '***',
    continueInChapter: true,
    typewriterMode: false,
    typewriterOffset: 40,
    showLineNumbers: false,
    showWordCount: true,
    focusMode: false,
};

export const useFormatStore = create<FormatStore>()(
    persist(
        (set) => ({
            ...defaultSettings,
            updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
            resetSettings: () => set(defaultSettings),
            toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
            toggleTypewriterMode: () => set((state) => ({ typewriterMode: !state.typewriterMode })),
        }),
        {
            name: 'format-settings',
        }
    )
);
