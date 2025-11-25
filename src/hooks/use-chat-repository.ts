import { useAppServices } from '@/infrastructure/di/AppContext';
import type { IChatRepository } from '@/domain/repositories/IChatRepository';

/**
 * Hook to access the Chat Repository
 * Now uses centralized DI container for singleton instance
 */
export function useChatRepository(): IChatRepository {
    return useAppServices().chatRepository;
}
