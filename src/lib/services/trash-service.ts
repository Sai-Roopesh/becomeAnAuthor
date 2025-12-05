import { db } from '@/lib/core/database';
import { toast } from '@/lib/toast-service';

/**
 * Trash Service
 * 
 * Implements soft-delete pattern for safe data recovery.
 * Items are marked with deletedAt timestamp instead of being permanently deleted.
 * Auto-cleanup removes items older than retention period.
 */
export class TrashService {
    private static readonly RETENTION_DAYS = 30;

    /**
     * Soft delete an item (move to trash)
     */
    async softDelete(tableName: 'nodes' | 'codex' | 'chatThreads', id: string): Promise<void> {
        try {
            await db.table(tableName).update(id, { deletedAt: Date.now() });
            console.log(`🗑️ Moved ${tableName}/${id} to trash`);
        } catch (error) {
            console.error(`Failed to soft delete ${tableName}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Restore an item from trash
     */
    async restore(tableName: 'nodes' | 'codex' | 'chatThreads', id: string): Promise<void> {
        try {
            await db.table(tableName).update(id, { deletedAt: null });
            toast.success('Item restored from trash');
            console.log(`♻️ Restored ${tableName}/${id} from trash`);
        } catch (error) {
            console.error(`Failed to restore ${tableName}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Permanently delete an item (bypasses trash)
     */
    async permanentDelete(tableName: 'nodes' | 'codex' | 'chatThreads', id: string): Promise<void> {
        try {
            await db.table(tableName).delete(id);
            console.log(`❌ Permanently deleted ${tableName}/${id}`);
        } catch (error) {
            console.error(`Failed to permanently delete ${tableName}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Get all items in trash for a specific table
     */
    async getTrash(tableName: 'nodes' | 'codex' | 'chatThreads'): Promise<any[]> {
        try {
            // Note: This requires deletedAt to be indexed in the table schema
            // For now, we filter in memory
            const all = await db.table(tableName).toArray();
            return all.filter(item => item.deletedAt != null);
        } catch (error) {
            console.error(`Failed to get trash for ${tableName}:`, error);
            return [];
        }
    }

    /**
     * Get trash item count
     */
    async getTrashCount(): Promise<number> {
        const [nodes, codex, threads] = await Promise.all([
            this.getTrash('nodes'),
            this.getTrash('codex'),
            this.getTrash('chatThreads'),
        ]);
        return nodes.length + codex.length + threads.length;
    }

    /**
     * Empty trash - permanently delete items older than retention period
     */
    async emptyExpiredTrash(): Promise<number> {
        const cutoffMs = TrashService.RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - cutoffMs;
        let count = 0;

        try {
            for (const tableName of ['nodes', 'codex', 'chatThreads'] as const) {
                const trashItems = await this.getTrash(tableName);
                const expired = trashItems.filter(item => item.deletedAt < cutoff);

                for (const item of expired) {
                    await this.permanentDelete(tableName, item.id);
                    count++;
                }
            }

            if (count > 0) {
                console.log(`🧹 Permanently deleted ${count} expired trash items`);
            }
            return count;
        } catch (error) {
            console.error('Failed to empty expired trash:', error);
            return count;
        }
    }

    /**
     * Empty all trash (user-initiated)
     */
    async emptyAllTrash(): Promise<number> {
        let count = 0;

        try {
            for (const tableName of ['nodes', 'codex', 'chatThreads'] as const) {
                const trashItems = await this.getTrash(tableName);

                for (const item of trashItems) {
                    await this.permanentDelete(tableName, item.id);
                    count++;
                }
            }

            if (count > 0) {
                toast.success(`Permanently deleted ${count} items from trash`);
            }
            return count;
        } catch (error) {
            console.error('Failed to empty all trash:', error);
            throw error;
        }
    }
}

export const trashService = new TrashService();
