import { useAppServices } from '@/infrastructure/di/AppContext';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';

/**
 * Hook to access the Codex Repository
 * Now uses centralized DI container for singleton instance
 */
export function useCodexRepository(): ICodexRepository {
    return useAppServices().codexRepository;
}
