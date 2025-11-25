import { useAppServices } from '@/infrastructure/di/AppContext';
import type { ISnippetRepository } from '@/domain/repositories/ISnippetRepository';

/**
 * Hook to access the Snippet Repository
 * Now uses centralized DI container for singleton instance
 */
export function useSnippetRepository(): ISnippetRepository {
    return useAppServices().snippetRepository;
}
