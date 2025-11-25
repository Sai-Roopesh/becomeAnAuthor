import { useAppServices } from '@/infrastructure/di/AppContext';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';

/**
 * Hook to access the Node Repository
 * Now uses centralized DI container for singleton instance
 */
export function useNodeRepository(): INodeRepository {
    return useAppServices().nodeRepository;
}
