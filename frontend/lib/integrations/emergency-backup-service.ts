/**
 * Emergency Backup Service (Tauri Version)
 * 
 * Uses filesystem-based backups via Tauri commands.
 * Stores backups in {project}/.meta/emergency_backups/
 */

import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('EmergencyBackup');
import { toast } from '@/shared/utils/toast-service';
import { getCurrentProjectPath } from '@/infrastructure/repositories/TauriNodeRepository';

interface EmergencyBackup {
    id: string;
    sceneId: string;
    content: any;
    createdAt: number;
    expiresAt: number;
}

export class EmergencyBackupService {
    /**
     * Save emergency backup to filesystem
     */
    async saveBackup(sceneId: string, content: any): Promise<boolean> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) {
            console.warn('EmergencyBackupService: No project path set');
            return false;
        }

        try {
            // Deep clone to remove non-serializable data
            const safeContent = JSON.parse(JSON.stringify(content));

            await invoke('save_emergency_backup', {
                projectPath,
                sceneId,
                content: safeContent
            });
            log.debug(`Emergency backup saved for scene ${sceneId}`);
            return true;
        } catch (error) {
            console.error('Emergency backup failed:', error);
            toast.error('Emergency backup failed. Please save your work manually.');
            return false;
        }
    }

    /**
     * Retrieve backup for a scene (returns null if expired or not found)
     */
    async getBackup(sceneId: string): Promise<EmergencyBackup | null> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return null;

        try {
            const backup = await invoke<EmergencyBackup | null>('get_emergency_backup', {
                projectPath,
                sceneId
            });
            return backup;
        } catch (error) {
            console.error('Failed to retrieve backup:', error);
            return null;
        }
    }

    /**
     * Check if a backup exists for a scene
     */
    async hasBackup(sceneId: string): Promise<boolean> {
        const backup = await this.getBackup(sceneId);
        return backup !== null;
    }

    /**
     * Delete backup after successful restore or dismissal
     */
    async deleteBackup(sceneId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            await invoke('delete_emergency_backup', { projectPath, sceneId });
            log.debug(`Emergency backup deleted for scene ${sceneId}`);
        } catch (error) {
            console.error('Failed to delete backup:', error);
        }
    }

    /**
     * Clear all expired backups (run on app startup)
     */
    async cleanupExpired(): Promise<number> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return 0;

        try {
            const count = await invoke<number>('cleanup_emergency_backups', { projectPath });
            if (count > 0) {
                log.debug(`Cleaned up ${count} expired emergency backups`);
            }
            return count;
        } catch (error) {
            console.error('Failed to cleanup expired backups:', error);
            return 0;
        }
    }
}

export const emergencyBackupService = new EmergencyBackupService();
