/**
 * Hook to run API key migration from localStorage to OS keychain
 * Runs once on app mount
 */
"use client";


import { useEffect, useState } from 'react';
import { migrateAPIKeysFromLocalStorage } from '@/core/storage/api-keys';

export function useAPIKeyMigration() {
    const [migrated, setMigrated] = useState(false);
    const [migrationCount, setMigrationCount] = useState(0);

    useEffect(() => {
        // Only run once
        if (migrated) return;

        async function runMigration() {
            try {
                console.log('🔐 Checking for API keys to migrate...');
                const count = await migrateAPIKeysFromLocalStorage();
                setMigrationCount(count);
                setMigrated(true);

                if (count > 0) {
                    console.log(`✅ Successfully migrated ${count} API key(s) to secure storage`);
                }
            } catch (error) {
                console.error('Failed to run API key migration:', error);
                setMigrated(true); // Mark as attempted even if failed
            }
        }

        runMigration();
    }, [migrated]);

    return { migrated, migrationCount };
}
