/**
 * Save Coordinator - Prevents race conditions in concurrent save operations
 * 
 * This singleton ensures that only one save operation per scene executes at a time,
 * preventing conflicts between auto-save (debounced) and AI-generation (immediate) saves.
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from '@/infrastructure/repositories/TauriNodeRepository';
import { toast } from '@/lib/toast-service';
import { storage } from '@/lib/safe-storage';

class SaveCoordinator {
    private saveQueue: Map<string, Promise<void>> = new Map();

    /**
     * Schedule a save operation for a scene
     * Ensures saves are serialized per scene to prevent race conditions
     */
    async scheduleSave(sceneId: string, getContent: () => any): Promise<void> {
        // If there's already a save in progress for this scene, wait for it
        const existingSave = this.saveQueue.get(sceneId);

        const saveOperation = (async () => {
            // Wait for any existing save to complete first
            if (existingSave) {
                try {
                    await existingSave;
                } catch {
                    // Ignore errors from previous save, we'll try again
                }
            }

            // Now perform our save via Tauri
            const projectPath = getCurrentProjectPath();
            if (!projectPath) {
                console.warn('No project path set, cannot save');
                return;
            }

            try {
                const content = getContent();
                // Serialize content to remove any Promises or non-serializable data
                const cleanContent = JSON.parse(JSON.stringify(content));

                await invoke('save_scene_by_id', {
                    projectPath,
                    sceneId,
                    content: typeof cleanContent === 'string' ? cleanContent : JSON.stringify(cleanContent),
                });
            } catch (error) {
                console.error('Save failed:', error);

                // Primary: Emergency backup via Tauri (filesystem)
                try {
                    const content = getContent();
                    const cleanContent = JSON.parse(JSON.stringify(content));

                    await invoke('save_emergency_backup', {
                        projectPath,
                        sceneId,
                        content: JSON.stringify(cleanContent),
                        timestamp: Date.now()
                    });

                    toast.error('Save failed. Emergency backup created.');
                } catch (backupError) {
                    console.error('Tauri backup failed, falling back to localStorage:', backupError);

                    // Fallback: localStorage (if Tauri also fails)
                    try {
                        const content = getContent();
                        const cleanContent = JSON.parse(JSON.stringify(content));
                        storage.setItem(`backup_scene_${sceneId}`, {
                            content: cleanContent,
                            timestamp: Date.now(),
                        });
                        toast.error('Save failed. Local fallback backup created.');
                    } catch (e) {
                        console.error('All backup methods failed:', e);
                        toast.error('Save failed. Could not create backup.');
                    }
                }

                throw error;
            }
        })();

        // Store this save operation in the queue
        this.saveQueue.set(sceneId, saveOperation);

        // Attach cleanup to the promise
        saveOperation.finally(() => {
            if (this.saveQueue.get(sceneId) === saveOperation) {
                this.saveQueue.delete(sceneId);
            }
        });

        return saveOperation;
    }

    /**
     * Check if a save is currently in progress for a scene
     */
    isSaving(sceneId: string): boolean {
        return this.saveQueue.has(sceneId);
    }
}

// Export singleton instance
export const saveCoordinator = new SaveCoordinator();
