'use client';

import { useEffect } from 'react';
import { freeTokenCounters } from '@/shared/utils/token-counter';
import { logger } from '@/core/logger';

/**
 * Cleanup Component
 * Handles app-level cleanup tasks on unmount
 */
export function AppCleanup() {
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            logger.debug('[AppCleanup] Freeing token counters');
            freeTokenCounters();
        };
    }, []);

    return null; // This component renders nothing
}
