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

    // \u2705 FIXED: Synchronous emergency backup + recovery on unload
    useEffect(() => {
        const handleUnload = (event: BeforeUnloadEvent) => {
            if (editorRef.current && sceneIdRef.current && hasUnsavedChanges.current) {
                // Show warning dialog to prevent accidental closure
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';

                // \u2705 Create synchronous localStorage backup (browser will wait)
                try {
                    const content = editorRef.current.getJSON();
                    const backupKey = `emergency_backup_${sceneIdRef.current}`;
                    localStorage.setItem(backupKey, JSON.stringify({
                        content,
                        timestamp: Date.now(),
                        sceneId: sceneIdRef.current,
                    }));
                } catch (error) {
                    console.error('Emergency backup failed:', error);
                }
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            // Also save on component unmount
            if (editorRef.current && sceneIdRef.current && hasUnsavedChanges.current) {
                saveContent(sceneIdRef.current, () => editorRef.current!.getJSON());
            }
        };
    }, [saveContent]);

    // \u2705 NEW: Automatic recovery on mount
    useEffect(() => {
        if (!editor || !sceneId) return;

        const backupKey = `emergency_backup_${sceneId}`;
        const backupData = localStorage.getItem(backupKey);

        if (backupData) {
            try {
                const backup = JSON.parse(backupData);
                const backupAge = Date.now() - backup.timestamp;

                // Only offer recovery if backup is less than 1 hour old
                if (backupAge < 3600000 && backup.content) {
                    const shouldRestore = confirm(
                        `Unsaved changes detected from ${new Date(backup.timestamp).toLocaleTimeString()}. Restore?`
                    );

                    if (shouldRestore) {
                        editor.commands.setContent(backup.content);
                        toast.success('Unsaved changes restored');
                        hasUnsavedChanges.current = true;
                    }
                }

                // Clean up backup
                localStorage.removeItem(backupKey);
            } catch (error) {
                console.error('Failed to restore backup:', error);
                localStorage.removeItem(backupKey);
            }
        }
    }, [sceneId, editor]);
}
