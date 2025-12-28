"use client";
import { useState } from 'react';

/**
 * Hook for managing editor state including word count tracking.
 * 
 * NOTE: Word count persistence is now handled automatically by the backend's
 * save_scene command, which calculates and updates word count during content saves.
 * This hook only tracks the current word count for UI display.
 */
export function useEditorState() {
    const [editorWordCount, setEditorWordCount] = useState(0);

    const handleWordCountUpdate = (count: number) => {
        setEditorWordCount(count);
    };

    return {
        editorWordCount,
        handleWordCountUpdate,
    };
}
