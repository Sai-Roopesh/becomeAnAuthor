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

    // Cursor
    writingMode: 'normal' | 'typewriter';
    continueInChapter: boolean;
    typewriterMode: boolean;

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
    writingMode: 'normal',
    continueInChapter: true,
    typewriterMode: false,
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

