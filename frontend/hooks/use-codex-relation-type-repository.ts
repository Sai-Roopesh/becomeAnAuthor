import { useAppServices } from '@/infrastructure/di/AppContext';
import type { ICodexRelationTypeRepository } from '@/domain/repositories/ICodexRelationTypeRepository';

/**
 * Hook to access Codex Relation Type Repository
 * 
 * ✅ ARCHITECTURE: Repository pattern - NEVER import db directly in components
 */
export function useCodexRelationTypeRepository(): ICodexRelationTypeRepository {
    return useAppServices().codexRelationTypeRepository;
}
