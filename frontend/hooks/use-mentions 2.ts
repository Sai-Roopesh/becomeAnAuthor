'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Mention } from '@/domain/entities/types';
import { getMentionRepository } from '@/infrastructure/repositories/TauriMentionRepository';
import { useProjectStore } from '@/store/use-project-store';
import { logger } from '@/core/logger';

/**
 * Hook for accessing mention tracking data for a codex entry
 * 
 * @param codexEntryId - The ID of the codex entry to get mentions for
 * @returns Mentions data, count, loading state, and refresh function
 */
export function useMentions(codexEntryId: string) {
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const activeProjectId = useProjectStore((state) => state.activeProjectId);

    const refresh = useCallback(async () => {
        if (!activeProjectId || !codexEntryId) {
            setMentions([]);
            setCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const repo = getMentionRepository();
            const [mentionsList, mentionCount] = await Promise.all([
                repo.getByCodexEntry(activeProjectId, codexEntryId),
                repo.countByCodexEntry(activeProjectId, codexEntryId),
            ]);

            setMentions(mentionsList);
            setCount(mentionCount);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load mentions';
            setError(message);
            logger.error('[useMentions] Failed to load mentions', { error: err });
        } finally {
            setLoading(false);
        }
    }, [activeProjectId, codexEntryId]);


    // Load mentions on mount and when dependencies change
    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        mentions,
        count,
        loading,
        error,
        refresh,
    };
}
