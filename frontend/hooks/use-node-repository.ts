'use client';

import { useRepository } from './use-repository';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';

/**
 * Hook to access the Node Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useNodeRepository(): INodeRepository {
    return useRepository<INodeRepository>('nodeRepository');
}
