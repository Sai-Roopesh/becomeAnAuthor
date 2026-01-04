'use client';

import { useRepository } from './use-repository';
import type { IChatRepository } from '@/domain/repositories/IChatRepository';

/**
 * Hook to access the Chat Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useChatRepository(): IChatRepository {
    return useRepository<IChatRepository>('chatRepository');
}
