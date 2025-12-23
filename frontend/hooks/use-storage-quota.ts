'use client';

import { useState, useEffect } from 'react';
import { storageQuotaService, StorageQuota } from '@/infrastructure/services/storage-quota-service';

/**
 * Hook to monitor storage quota
 * 
 * Returns current storage usage and alerts for low/critical states.
 * Refreshes every 30 seconds to detect changes.
 * 
 * @example
 * ```tsx
 * function StorageIndicator() {
 *   const quota = useStorageQuota();
 *   
 *   if (quota?.isCritical) {
 *     return <Alert variant="destructive">Storage almost full!</Alert>;
 *   }
 *   
 *   return <span>{Math.round(quota?.percentUsed * 100)}% used</span>;
 * }
 * ```
 */
export function useStorageQuota() {
    const [quota, setQuota] = useState<StorageQuota | null>(null);

    useEffect(() => {
        // Initial fetch
        storageQuotaService.getQuota().then(setQuota);

        // Refresh every 30 seconds
        const interval = setInterval(() => {
            storageQuotaService.getQuota().then(setQuota);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return quota;
}
