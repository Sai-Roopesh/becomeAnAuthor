import { useRepository } from './use-repository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';

/**
 * Hook to access the Project Repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useProjectRepository(): IProjectRepository {
    return useRepository<IProjectRepository>('projectRepository');
}
