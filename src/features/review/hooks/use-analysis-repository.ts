import { useAppServices } from '@/infrastructure/di/AppContext';

/**
 * Hook providing access to analysis repository
 * Follows existing pattern used by other features
 */
export function useAnalysisRepository() {
    const { analysisRepository } = useAppServices();

    return {
        getAll: (projectId: string) => analysisRepository.getByProject(projectId),
        getByType: (projectId: string, type: string) => analysisRepository.getByType(projectId, type),
        getLatest: (projectId: string) => analysisRepository.getLatest(projectId),
        create: (analysis: any) => analysisRepository.create(analysis),
        dismiss: (id: string) => analysisRepository.update(id, { dismissed: true }),
        resolve: (id: string) => analysisRepository.update(id, { resolved: true }),
        delete: (id: string) => analysisRepository.delete(id),
    };
}
