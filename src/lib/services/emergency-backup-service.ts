import { db, EmergencyBackup } from '@/lib/core/database';
import { toast } from '@/lib/toast-service';

/**
 * Emergency Backup Service
 * 
 * Replaces localStorage-based emergency backups with IndexedDB.
 * Benefits:
 * - Much larger quota (~500MB+ vs 5MB)
 * - No silent failures on quota exceeded
 * - Automatic cleanup of expired backups
 */
export class EmergencyBackupService {
    private static EXPIRY_HOURS = 1;

    /**
     * Save emergency backup to IndexedDB (not localStorage)
     * Handles quota errors gracefully with user notification
     */
    async saveBackup(sceneId: string, content: any): Promise<boolean> {
        try {
            const expiryMs = EmergencyBackupService.EXPIRY_HOURS * 60 * 60 * 1000;
            const backup: EmergencyBackup = {
                id: `backup_${sceneId}_${Date.now()}`,
                sceneId,
                content: JSON.parse(JSON.stringify(content)), // Deep clone to remove non-serializable
                createdAt: Date.now(),
                expiresAt: Date.now() + expiryMs,
            };

            await db.emergencyBackups.put(backup);
            console.log(`📦 Emergency backup saved for scene ${sceneId}`);
            return true;
        } catch (error) {
            console.error('Emergency backup failed:', error);
            toast.error('Emergency backup failed. Please save your work manually.');
            return false;
        }
    }

    /**
     * Retrieve most recent valid backup for a scene
     */
    async getBackup(sceneId: string): Promise<EmergencyBackup | null> {
        try {
            const backups = await db.emergencyBackups
                .where('sceneId')
                .equals(sceneId)
                .filter(b => b.expiresAt > Date.now())
                .sortBy('createdAt');

            return backups.length > 0 ? backups[backups.length - 1] : null;
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
     * Delete backup after successful restore or manual dismissal
     */
    async deleteBackup(sceneId: string): Promise<void> {
        try {
            await db.emergencyBackups
                .where('sceneId')
                .equals(sceneId)
                .delete();
            console.log(`🗑️ Emergency backup deleted for scene ${sceneId}`);
        } catch (error) {
            console.error('Failed to delete backup:', error);
        }
    }

    /**
     * Clear all expired backups (run on app startup)
     */
    async cleanupExpired(): Promise<number> {
        try {
            const count = await db.emergencyBackups
                .where('expiresAt')
                .below(Date.now())
                .delete();

            if (count > 0) {
                console.log(`🧹 Cleaned up ${count} expired emergency backups`);
            }
            return count;
        } catch (error) {
            console.error('Failed to cleanup expired backups:', error);
            return 0;
        }
    }
}

export const emergencyBackupService = new EmergencyBackupService();
