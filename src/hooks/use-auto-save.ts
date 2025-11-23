/**
 * Custom hook for auto-saving editor content to the database
 * Handles debounced saves with error recovery and emergency backup
 */


import { useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/db';
import { toast } from '@/lib/toast-service';
import { storage } from '@/lib/safe-storage';
import { Editor } from '@tiptap/react';
import { useDebounce } from '@/hooks/use-debounce';

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

    const saveContent = useCallback(async (content: any, id: string) => {
        try {
            await db.nodes.update(id, {
                content: content,
                updatedAt: Date.now(),
            } as any);
            hasUnsavedChanges.current = false;
        } catch (error) {
            console.error('Save failed:', error);

            // Emergency backup
            try {
                storage.setItem(`backup_scene_${id}`, {
                    content: content,
                    timestamp: Date.now(),
                });
            } catch (e) {
                console.error('Backup failed', e);
            }

            toast.error('Failed to save work. Local backup created.');
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
                saveContent(editor.getJSON(), sceneId);
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
                const content = editorRef.current.getJSON();
                // We can't await here reliably, but we can try
                saveContent(content, sceneIdRef.current);
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            handleUnload(); // Also call on component unmount
        };
    }, [saveContent]);
}
