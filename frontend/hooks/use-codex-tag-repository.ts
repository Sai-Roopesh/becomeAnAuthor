import { useAppServices } from '@/infrastructure/di/AppContext';
import type { ICodexTagRepository } from '@/domain/repositories/ICodexTagRepository';

/**
 * Hook to access Codex Tag Repository
 * 
 * ✅ ARCHITECTURE: Repository pattern - NEVER import db directly in components
 */
export function useCodexTagRepository(): ICodexTagRepository {
    return useAppServices().codexTagRepository;
}
