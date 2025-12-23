/**
 * Storage Quota Service Stub
 * 
 * This was originally for IndexedDB storage tracking.
 * For Tauri file-based storage, there's no practical quota limit.
 * This is a stub to maintain API compatibility.
 */

export interface StorageQuota {
    used: number;
    available: number;
    percentUsed: number;
    isLow: boolean;
    isCritical: boolean;
}

class StorageQuotaService {
    async getQuota(): Promise<StorageQuota> {
        // For file-based Tauri storage, report essentially unlimited
        return {
            used: 0,
            available: Number.MAX_SAFE_INTEGER,
            percentUsed: 0,
            isLow: false,
            isCritical: false,
        };
    }
}

export const storageQuotaService = new StorageQuotaService();
