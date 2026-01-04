'use client';

import { useRepository } from './use-repository';
import type { ISnippetRepository } from '@/domain/repositories/ISnippetRepository';

/**
 * Hook to access the Snippet Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useSnippetRepository(): ISnippetRepository {
    return useRepository<ISnippetRepository>('snippetRepository');
}
