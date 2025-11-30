/**
 * Save Coordinator - Prevents race conditions in concurrent save operations
 * 
 * This singleton ensures that only one save operation per scene executes at a time,
 * preventing conflicts between auto-save (debounced) and AI-generation (immediate) saves.
 */

import { db } from '@/lib/core/database';

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

            // Now perform our save
            try {
                const content = getContent();
                // Serialize content to remove any Promises or non-serializable data
                const cleanContent = JSON.parse(JSON.stringify(content));

                await db.nodes.update(sceneId, {
                    content: cleanContent,
                    updatedAt: Date.now(),
                } as any);
            } catch (error) {
                console.error('Save failed:', error);

                // Emergency backup to localStorage
                try {
                    const content = getContent();
                    const cleanContent = JSON.parse(JSON.stringify(content));
                    storage.setItem(`backup_scene_${sceneId}`, {
                        content: cleanContent,
                        timestamp: Date.now(),
                    });
                } catch (e) {
                    console.error('Backup failed', e);
                }

                toast.error('Failed to save work. Local backup created.');
                throw error;
            }
        })();

        // Store this save operation in the queue
        this.saveQueue.set(sceneId, saveOperation);

        // Attach cleanup to the promise
        // We do this separately to avoid the circular reference issue
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
