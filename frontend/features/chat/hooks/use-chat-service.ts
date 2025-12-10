import { useRepository } from '@/hooks/use-repository';
import type { IChatService } from '@/domain/services/IChatService';

/**
 * Hook to access the Chat Service
 * Uses generic repository factory to eliminate code duplication
 */
export function useChatService(): IChatService {
    return useRepository<IChatService>('chatService');
}
