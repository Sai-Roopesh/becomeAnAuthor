/**
 * Hook to run API key migration from localStorage to OS keychain
 * Runs once on app mount
 */
"use client";


import { useEffect, useState } from 'react';
import { migrateAPIKeysFromLocalStorage } from '@/core/storage/api-keys';
import { logger } from '@/core/logger';

export function useAPIKeyMigration() {
    const [migrated, setMigrated] = useState(false);
    const [migrationCount, setMigrationCount] = useState(0);

    useEffect(() => {
        // Only run once
        if (migrated) return;

        async function runMigration() {
            try {
                logger.debug('🔐 Checking for API keys to migrate');
                const count = await migrateAPIKeysFromLocalStorage();
                setMigrationCount(count);
                setMigrated(true);

                if (count > 0) {
                    logger.info(`✅ Successfully migrated ${count} API key(s) to secure storage`);
                }
            } catch (error) {
                logger.error('Failed to run API key migration', error instanceof Error ? error : undefined);
                setMigrated(true); // Mark as attempted even if failed
            }
        }

        runMigration();
    }, [migrated]);

    return { migrated, migrationCount };
}
