/**
 * Custom hook for auto-saving editor content to the database
 * Handles debounced saves with error recovery and emergency backup
 */


import { useEffect, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast-service';
import { Editor } from '@tiptap/react';
import { useDebounce } from '@/hooks/use-debounce';
import { saveCoordinator } from '@/lib/core/save-coordinator';

export function useAutoSave(sceneId: string, editor: Editor | null) {
    // Keep track of the latest editor instance and sceneId for cleanup
    const editorRef = useRef(editor);
    const sceneIdRef = useRef(sceneId);

    // Track if we have unsaved changes
    const hasUnsavedChanges = useRef(false);

    // Update refs
    useEffect(() => {
        editorRef.current = editor;
        sceneIdRef.current = sceneId;
    }, [editor, sceneId]);

    const saveContent = useCallback(async (id: string, getContent: () => any) => {
        try {
            // Use the save coordinator to prevent race conditions
            await saveCoordinator.scheduleSave(id, getContent);
            hasUnsavedChanges.current = false;
        } catch (error) {
            // Error handling is done in the coordinator
            // Just mark that we still have unsaved changes
            hasUnsavedChanges.current = true;
        }
    }, []);

    // Debounced save
    useEffect(() => {
        if (!editor || !sceneId) return;

        const handleUpdate = () => {
            hasUnsavedChanges.current = true;
        };

        editor.on('update', handleUpdate);

        const interval = setInterval(() => {
            if (hasUnsavedChanges.current && editor && !editor.isDestroyed) {
                saveContent(sceneId, () => editor.getJSON());
            }
        }, 1000); // Check every second, but only save if changed

        return () => {
            editor.off('update', handleUpdate);
            clearInterval(interval);
        };
    }, [editor, sceneId, saveContent]);

    // Force save on unmount / visibility change
    useEffect(() => {
        const handleUnload = () => {
            if (editorRef.current && sceneIdRef.current && hasUnsavedChanges.current) {
                // Synchronous attempt or best effort
                // We can't await here reliably, but we can try
                saveContent(sceneIdRef.current, () => editorRef.current!.getJSON());
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            handleUnload(); // Also call on component unmount
        };
    }, [saveContent]);
}
