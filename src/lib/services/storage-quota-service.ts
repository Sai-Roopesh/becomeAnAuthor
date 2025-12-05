/**
 * Storage Quota Service
 * 
 * Monitors IndexedDB storage usage and warns users before they run out of space.
 * Uses navigator.storage.estimate() API for quota information.
 */

export interface StorageQuota {
    used: number;
    total: number;
    percentUsed: number;
    isLow: boolean;      // 80%+ used
    isCritical: boolean; // 95%+ used
}

export class StorageQuotaService {
    private static readonly LOW_THRESHOLD = 0.8;      // 80%
    private static readonly CRITICAL_THRESHOLD = 0.95; // 95%

    /**
     * Get current storage quota information
     */
    async getQuota(): Promise<StorageQuota> {
        // Fallback for browsers that don't support storage API
        if (!navigator.storage?.estimate) {
            return {
                used: 0,
                total: 0,
                percentUsed: 0,
                isLow: false,
                isCritical: false,
            };
        }

        try {
            const { usage = 0, quota = 0 } = await navigator.storage.estimate();
            const percentUsed = quota > 0 ? usage / quota : 0;

            return {
                used: usage,
                total: quota,
                percentUsed,
                isLow: percentUsed >= StorageQuotaService.LOW_THRESHOLD,
                isCritical: percentUsed >= StorageQuotaService.CRITICAL_THRESHOLD,
            };
        } catch (error) {
            console.error('Failed to get storage quota:', error);
            return {
                used: 0,
                total: 0,
                percentUsed: 0,
                isLow: false,
                isCritical: false,
            };
        }
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * Get a formatted storage usage string
     */
    async getUsageString(): Promise<string> {
        const quota = await this.getQuota();
        if (quota.total === 0) return 'Storage info unavailable';

        const used = this.formatBytes(quota.used);
        const total = this.formatBytes(quota.total);
        const percent = Math.round(quota.percentUsed * 100);

        return `${used} / ${total} (${percent}%)`;
    }
}

export const storageQuotaService = new StorageQuotaService();
