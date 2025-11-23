/**
 * Custom hook for auto-saving editor content to the database
 * Handles debounced saves with error recovery and emergency backup
 */

import { useEffect } from 'react';
import { db } from '@/lib/db';
import { toast } from '@/lib/toast-service';
import { storage } from '@/lib/safe-storage';

export function useAutoSave(sceneId: string, content: any, debouncedContent: any) {
    useEffect(() => {
        if (!debouncedContent || !sceneId) return;

        const saveContent = async () => {
            try {
                await db.nodes.update(sceneId, {
                    content: debouncedContent,
                    updatedAt: Date.now(),
                } as any); // TODO: Fix after Scene type is properly discriminated in DB
                // Optionally show subtle success indicator
                // toast.success('Saved', { duration: 1000 });
            } catch (error) {
                console.error('Save failed:', error);

                // Show error notification with retry action
                toast.error('Failed to save your work', {
                    description: 'Your work has been backed up locally.',
                    action: {
                        label: 'Retry',
                        onClick: () => saveContent(),
                    },
                    duration: 10000, // Show for 10 seconds
                });

                // Emergency backup to localStorage
                try {
                    storage.setItem(`backup_scene_${sceneId}`, {
                        content: debouncedContent,
                        timestamp: Date.now(),
                    });
                } catch (backupError) {
                    console.error('Emergency backup failed:', backupError);
                    toast.error('Critical: Unable to backup your work. Please copy your text manually.');
                }
            }
        };

        saveContent();
    }, [debouncedContent, sceneId]);
}
