/**
 * Custom hook for auto-saving editor content to the database
 * Handles debounced saves with error recovery and emergency backup
 * 
 * UPDATED: Now uses IndexedDB-based EmergencyBackupService instead of localStorage
 * to avoid 5MB quota issues and silent failures.
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from '@/shared/utils/toast-service';
import { Editor } from '@tiptap/react';
import { saveCoordinator } from '@/lib/core/save-coordinator';
import { emergencyBackupService } from '@/lib/integrations/emergency-backup-service';

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

    // Debounced save interval
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

    // ✅ UPDATED: Emergency backup using IndexedDB (not localStorage)
    useEffect(() => {
        const handleUnload = (event: BeforeUnloadEvent) => {
            if (editorRef.current && sceneIdRef.current && hasUnsavedChanges.current) {
                // Show warning dialog to prevent accidental closure
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';

                // ✅ UPDATED: Save to IndexedDB via EmergencyBackupService
                // Note: This is async but we can't await in beforeunload
                // The service handles errors gracefully
                try {
                    const content = editorRef.current.getJSON();
                    emergencyBackupService.saveBackup(sceneIdRef.current, content);
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

    // ✅ UPDATED: Automatic recovery from IndexedDB backup on mount
    useEffect(() => {
        if (!editor || !sceneId) return;

        const checkForBackup = async () => {
            try {
                const backup = await emergencyBackupService.getBackup(sceneId);

                if (backup && backup.content) {
                    const backupAge = Date.now() - backup.createdAt;
                    const backupDate = new Date(backup.createdAt).toLocaleTimeString();

                    // Only offer recovery if backup is less than 1 hour old
                    if (backupAge < 3600000) {
                        const shouldRestore = confirm(
                            `Unsaved changes detected from ${backupDate}. Restore?`
                        );

                        if (shouldRestore) {
                            editor.commands.setContent(backup.content);
                            toast.success('Unsaved changes restored from backup');
                            hasUnsavedChanges.current = true;
                        }
                    }

                    // Clean up backup after handling
                    await emergencyBackupService.deleteBackup(sceneId);
                }
            } catch (error) {
                console.error('Failed to check for backup:', error);
            }
        };

        checkForBackup();
    }, [sceneId, editor]);

    // ✅ NEW: Cleanup expired backups on mount (once per session)
    useEffect(() => {
        emergencyBackupService.cleanupExpired();
    }, []);
}

