'use client';

import { useRepository } from './use-repository';
import type { ICodexTagRepository } from '@/domain/repositories/ICodexTagRepository';

/**
 * Hook to access Codex Tag Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useCodexTagRepository(): ICodexTagRepository {
    return useRepository<ICodexTagRepository>('codexTagRepository');
}
