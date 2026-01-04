'use client';

import { useRepository } from './use-repository';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';

/**
 * Hook to access the Codex Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useCodexRepository(): ICodexRepository {
    return useRepository<ICodexRepository>('codexRepository');
}
