'use client';

import { useRepository } from './use-repository';
import type { ICodexRelationTypeRepository } from '@/domain/repositories/ICodexRelationTypeRepository';

/**
 * Hook to access Codex Relation Type Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useCodexRelationTypeRepository(): ICodexRelationTypeRepository {
    return useRepository<ICodexRelationTypeRepository>('codexRelationTypeRepository');
}
