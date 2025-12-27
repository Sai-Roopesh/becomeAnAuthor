/**
 * EditorStateManager - VS Code-style save state management
 * 
 * Implements:
 * - Dirty flag tracking
 * - Event-driven saves (debounced)
 * - Save status UI updates
 * - Emergency backups on save failure
 * - Status change notifications
 * 
 * Architecture:
 * - Single source of truth for save state
 * - Integrates with existing SaveCoordinator
 * - Follows VS Code save patterns
 */

import { Editor } from '@tiptap/react';
import { saveCoordinator } from './save-coordinator';
import { emergencyBackupService } from '@/infrastructure/services/emergency-backup-service';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('EditorStateManager');

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface SaveStatusListener {
    (status: SaveStatus, lastSaved?: number): void;
}

export interface EditorStateManagerOptions {
    debounceMs?: number;
}

export class EditorStateManager {
    private isDirty = false;
    private isSaving = false;
    private saveStatus: SaveStatus = 'saved';
    private lastSavedAt: number | null = null;
    private statusListeners: Set<SaveStatusListener> = new Set();
    private saveDebounceMs: number;
    private debouncedSaveTimer: NodeJS.Timeout | null = null;
    private updateUnsubscribe: (() => void) | null = null;

    constructor(
        private editor: Editor,
        private sceneId: string,
        options: EditorStateManagerOptions = {}
    ) {
        this.saveDebounceMs = options.debounceMs ?? 500;
        this.attachListeners();
    }

    /**
     * Attach editor event listeners
     */
    private attachListeners() {
        const handleUpdate = () => {
            if (!this.isDirty) {
                this.markDirty();
            }
            this.scheduleDebouncedSave();
        };

        this.editor.on('update', handleUpdate);

        // Store unsubscribe function
        this.updateUnsubscribe = () => {
            this.editor.off('update', handleUpdate);
        };

        log.debug(`Attached listeners for scene ${this.sceneId}`);
    }

    /**
     * Mark document as dirty (has unsaved changes)
     */
    private markDirty() {
        if (this.isDirty) return;

        this.isDirty = true;
        this.updateStatus('unsaved');
        log.debug(`Scene ${this.sceneId} marked as dirty`);
    }

    /**
     * Schedule a debounced save
     */
    private scheduleDebouncedSave() {
        // Clear existing timer
        if (this.debouncedSaveTimer) {
            clearTimeout(this.debouncedSaveTimer);
        }

        // Schedule new save
        this.debouncedSaveTimer = setTimeout(() => {
            this.save().catch(error => {
                log.error('Debounced save failed:', error);
            });
        }, this.saveDebounceMs);
    }

    /**
     * Save immediately (for critical actions)
     */
    async saveImmediate(): Promise<void> {
        // Cancel any pending debounced save
        if (this.debouncedSaveTimer) {
            clearTimeout(this.debouncedSaveTimer);
            this.debouncedSaveTimer = null;
        }

        return this.save();
    }

    /**
     * Perform actual save
     */
    private async save(): Promise<void> {
        if (!this.isDirty) {
            log.debug(`Scene ${this.sceneId} is clean, skipping save`);
            return;
        }

        if (this.isSaving) {
            log.debug(`Scene ${this.sceneId} is already saving, skipping`);
            return;
        }

        this.isSaving = true;
        this.updateStatus('saving');

        try {
            const content = this.editor.getJSON();
            log.debug(`Saving scene ${this.sceneId}...`);

            await saveCoordinator.scheduleSave(this.sceneId, () => content);

            this.isDirty = false;
            this.lastSavedAt = Date.now();
            this.updateStatus('saved');
            log.debug(`✅ Scene ${this.sceneId} saved successfully`);
        } catch (error) {
            log.error(`❌ Save failed for scene ${this.sceneId}:`, error);
            this.updateStatus('error');

            // Create emergency backup on failure
            try {
                const content = this.editor.getJSON();
                await emergencyBackupService.saveBackup(this.sceneId, content);
                log.debug('Emergency backup created');
            } catch (backupError) {
                log.error('Emergency backup also failed:', backupError);
            }

            throw error;
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Update save status and notify listeners
     */
    private updateStatus(status: SaveStatus) {
        this.saveStatus = status;
        this.notifyListeners();
    }

    /**
     * Subscribe to save status changes
     */
    onStatusChange(listener: SaveStatusListener): () => void {
        this.statusListeners.add(listener);
        // Immediately notify with current status
        listener(this.saveStatus, this.lastSavedAt ?? undefined);

        // Return unsubscribe function
        return () => {
            this.statusListeners.delete(listener);
        };
    }

    /**
     * Notify all status listeners
     */
    private notifyListeners() {
        this.statusListeners.forEach(listener => {
            listener(this.saveStatus, this.lastSavedAt ?? undefined);
        });
    }

    /**
     * Get current save status
     */
    getStatus(): { status: SaveStatus; isDirty: boolean; isSaving: boolean; lastSavedAt: number | null } {
        return {
            status: this.saveStatus,
            isDirty: this.isDirty,
            isSaving: this.isSaving,
            lastSavedAt: this.lastSavedAt,
        };
    }

    /**
     * Force a save and return when complete
     */
    async flush(): Promise<void> {
        return this.saveImmediate();
    }

    /**
     * Cleanup and detach listeners
     */
    destroy() {
        // Clear debounce timer
        if (this.debouncedSaveTimer) {
            clearTimeout(this.debouncedSaveTimer);
        }

        // Detach editor listeners
        if (this.updateUnsubscribe) {
            this.updateUnsubscribe();
        }

        // Clear status listeners
        this.statusListeners.clear();

        log.debug(`EditorStateManager destroyed for scene ${this.sceneId}`);
    }
}
