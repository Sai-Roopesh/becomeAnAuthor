'use client';

import { useAPIKeyMigration } from '@/hooks/use-api-key-migration';
import { AppCleanup } from '@/components/app-cleanup';

/**
 * Wrapper component to handle API key migration on mount
 * Runs migration in background without blocking UI
 */
export function MigrationWrapper({ children }: { children: React.ReactNode }) {
    const { migrated } = useAPIKeyMigration();

    // Don't block rendering - migration happens in background
    return (
        <>
            <AppCleanup />
            {children}
        </>
    );
}
