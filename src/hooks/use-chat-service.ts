import { useAppServices } from '@/infrastructure/di/AppContext';
import type { IChatService } from '@/domain/services/IChatService';

/**
 * Hook to access the Chat Service
 * Now uses centralized DI container for singleton instance
 */
export function useChatService(): IChatService {
    return useAppServices().chatService;
}
