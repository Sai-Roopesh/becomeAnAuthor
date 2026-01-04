'use client';

import { useRepository } from './use-repository';
import type { ICodexTemplateRepository } from '@/domain/repositories/ICodexTemplateRepository';

/**
 * Hook to access Codex Template Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useCodexTemplateRepository(): ICodexTemplateRepository {
    return useRepository<ICodexTemplateRepository>('codexTemplateRepository');
}
