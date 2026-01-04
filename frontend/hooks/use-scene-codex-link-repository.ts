'use client';

import { useRepository } from './use-repository';
import type { ISceneCodexLinkRepository } from '@/domain/repositories/ISceneCodexLinkRepository';

/**
 * Hook to access the Scene-Codex Link Repository
 * Enables Plan-Codex integration for tracking which codex entries appear in which scenes
 */
export function useSceneCodexLinkRepository(): ISceneCodexLinkRepository {
    return useRepository<ISceneCodexLinkRepository>('sceneCodexLinkRepository');
}
