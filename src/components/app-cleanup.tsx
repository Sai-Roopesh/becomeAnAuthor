'use client';

import { useEffect } from 'react';
import { freeTokenCounters } from '@/lib/token-counter';

/**
 * Cleanup Component
 * Handles app-level cleanup tasks on unmount
 */
export function AppCleanup() {
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            console.log('[AppCleanup] Freeing token counters...');
            freeTokenCounters();
        };
    }, []);

    return null; // This component renders nothing
}
