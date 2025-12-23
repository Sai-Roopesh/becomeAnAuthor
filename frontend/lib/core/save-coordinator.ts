/**
 * Save Coordinator - Prevents race conditions in concurrent save operations
 *
 * This singleton ensures that only one save operation per scene executes at a time,
 * preventing conflicts between auto-save (debounced) and AI-generation (immediate) saves.
 */

import { invoke } from '@tauri-apps/api/core';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';
import { toast } from '@/shared/utils/toast-service';
import { storage } from '@/core/storage/safe-storage';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('SaveCoordinator');

class SaveCoordinator {
    private saveQueue: Map<string, Promise<void>> = new Map();
    private cancelledScenes: Set<string> = new Set();

    /**
     * Schedule a save operation for a scene
     * Ensures saves are serialized per scene to prevent race conditions
     */
    async scheduleSave(sceneId: string, getContent: () => any): Promise<void> {
        // Check if this scene was cancelled (deleted)
        if (this.cancelledScenes.has(sceneId)) {
            log.debug(`Scene ${sceneId} was deleted, skipping save`);
            return;
        }

        log.debug(`scheduleSave called for scene: ${sceneId}`);

        // If there's already a save in progress for this scene, wait for it
        const existingSave = this.saveQueue.get(sceneId);

        const saveOperation = (async () => {
            // Wait for any existing save to complete first
            if (existingSave) {
                try {
                    log.debug(`Waiting for existing save to complete: ${sceneId}`);
                    await existingSave;
                } catch {
                    // Ignore errors from previous save, we'll try again
                }
            }

            // Check again if cancelled after waiting
            if (this.cancelledScenes.has(sceneId)) {
                log.debug(`Scene ${sceneId} was deleted during wait, skipping save`);
                return;
            }

            // Now perform our save via Tauri
            const projectPath = TauriNodeRepository.getInstance().getProjectPath();
            if (!projectPath) {
                console.warn('[SaveCoordinator] No project path set, cannot save');
                return;
            }

            try {
                const content = getContent();
                log.debug(`Got content for scene ${sceneId}`, { contentType: typeof content, preview: JSON.stringify(content).substring(0, 100) });

                // Serialize content to remove any Promises or non-serializable data
                const cleanContent = JSON.parse(JSON.stringify(content));

                log.debug(`Calling save_scene_by_id for ${sceneId}`);
                // Tauri auto-converts Rust snake_case to JS camelCase
                await invoke('save_scene_by_id', {
                    projectPath,
                    sceneId,
                    content: typeof cleanContent === 'string' ? cleanContent : JSON.stringify(cleanContent),
                });
                log.debug(`✅ Save successful for scene: ${sceneId}`);

                // CRITICAL: Invalidate useLiveQuery cache so scene reloads fresh data
                const { invalidateQueries } = await import('@/hooks/use-live-query');
                invalidateQueries();
                log.debug(`Invalidated query cache for scene: ${sceneId}`);
            } catch (error) {
                const errorMessage = String(error);

                // Handle deleted scene gracefully - don't show error or try backup
                if (errorMessage.includes('Scene not found') || errorMessage.includes('not found in structure')) {
                    log.debug(`Scene ${sceneId} was deleted, save cancelled gracefully`);
                    this.cancelledScenes.add(sceneId);
                    return;
                }

                console.error(`[SaveCoordinator] ❌ Save failed for scene ${sceneId}:`, error);

                // Primary: Emergency backup via Tauri (filesystem)
                try {
                    const content = getContent();
                    const cleanContent = JSON.parse(JSON.stringify(content));

                    // save_emergency_backup takes a struct with camelCase fields (serde rename)
                    await invoke('save_emergency_backup', {
                        backup: {
                            id: `backup_${sceneId}_${Date.now()}`,
                            sceneId,
                            content: JSON.stringify(cleanContent),
                            timestamp: Date.now(),
                            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
                        }
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
                log.debug(`Removed scene ${sceneId} from queue`);
            }
        });

        return saveOperation;
    }

    /**
     * Cancel any pending saves for a scene (call when scene is deleted)
     */
    cancelPendingSaves(sceneId: string): void {
        log.debug(`Cancelling pending saves for scene: ${sceneId}`);
        this.cancelledScenes.add(sceneId);
        this.saveQueue.delete(sceneId);
    }

    /**
     * Clear a scene from the cancelled list (if it was recreated)
     */
    clearCancelledScene(sceneId: string): void {
        this.cancelledScenes.delete(sceneId);
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
