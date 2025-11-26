/**
 * Save Coordinator - Prevents race conditions in concurrent save operations
 * 
 * This singleton ensures that only one save operation per scene executes at a time,
 * preventing conflicts between auto-save (debounced) and AI-generation (immediate) saves.
 */

import { db } from './db';
import { toast } from './toast-service';
import { storage } from './safe-storage';

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
                await db.nodes.update(sceneId, {
                    content: content,
                    updatedAt: Date.now(),
                } as any);
            } catch (error) {
                console.error('Save failed:', error);

                // Emergency backup to localStorage
                try {
                    const content = getContent();
                    storage.setItem(`backup_scene_${sceneId}`, {
                        content: content,
                        timestamp: Date.now(),
                    });
                } catch (e) {
                    console.error('Backup failed', e);
                }

                toast.error('Failed to save work. Local backup created.');
                throw error;
            } finally {
                // Clean up the queue entry if it's still our promise
                if (this.saveQueue.get(sceneId) === saveOperation) {
                    this.saveQueue.delete(sceneId);
                }
            }
        })();

        // Store this save operation in the queue
        this.saveQueue.set(sceneId, saveOperation);

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
