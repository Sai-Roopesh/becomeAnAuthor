/**
 * Format Store
 * Persisted editor formatting preferences: typography, typewriter mode, focus mode
 */

import { create } from "zustand";

export interface FormatSettings {
  // Typography
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textIndent: number;
  alignment: "left" | "center" | "right" | "justify";
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

export const defaultFormatSettings: FormatSettings = {
  fontFamily: "Georgia",
  fontSize: 16,
  lineHeight: 1.8,
  textIndent: 0,
  alignment: "left",
  paragraphSpacing: 1.2,
  pageWidth: 700,
  sceneDividerStyle: "***",
  continueInChapter: true,
  typewriterMode: false,
  typewriterOffset: 40,
  showLineNumbers: false,
  showWordCount: true,
  focusMode: false,
};

export const useFormatStore = create<FormatStore>()((set) => ({
  ...defaultFormatSettings,
  updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
  resetSettings: () => set(defaultFormatSettings),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  toggleTypewriterMode: () =>
    set((state) => ({ typewriterMode: !state.typewriterMode })),
}));

export function normalizeFormatSettings(
  value: Partial<FormatSettings> | undefined,
): FormatSettings {
  return {
    ...defaultFormatSettings,
    ...(value ?? {}),
  };
}

export function selectFormatSettings(state: FormatStore): FormatSettings {
  return {
    fontFamily: state.fontFamily,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    textIndent: state.textIndent,
    alignment: state.alignment,
    paragraphSpacing: state.paragraphSpacing,
    pageWidth: state.pageWidth,
    sceneDividerStyle: state.sceneDividerStyle,
    continueInChapter: state.continueInChapter,
    typewriterMode: state.typewriterMode,
    typewriterOffset: state.typewriterOffset,
    showLineNumbers: state.showLineNumbers,
    showWordCount: state.showWordCount,
    focusMode: state.focusMode,
  };
}
