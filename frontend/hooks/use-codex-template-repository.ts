import { useAppServices } from '@/infrastructure/di/AppContext';
import type { ICodexTemplateRepository } from '@/domain/repositories/ICodexTemplateRepository';

/**
 * Hook to access Codex Template Repository
 * 
 * ✅ ARCHITECTURE: Repository pattern - NEVER import db directly in components
 */
export function useCodexTemplateRepository(): ICodexTemplateRepository {
    return useAppServices().codexTemplateRepository;
}
