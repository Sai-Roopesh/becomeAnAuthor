/**
 * Collaboration Repository Interface
 * 
 * Abstracts Yjs state persistence operations.
 * Per CODING_GUIDELINES.md: Layer 4 - Repository Interface
 */

import type { YjsStateSnapshot } from '@/domain/entities/types';

export interface ICollaborationRepository {
    /**
     * Save Yjs document state for a scene
     */
    saveYjsState(sceneId: string, projectId: string, update: Uint8Array): Promise<void>;

    /**
     * Load Yjs document state for a scene
     */
    loadYjsState(sceneId: string, projectId: string): Promise<YjsStateSnapshot | null>;

    /**
     * Check if Yjs state exists for a scene
     */
    hasYjsState(sceneId: string, projectId: string): Promise<boolean>;

    /**
     * Delete Yjs state for a scene
     */
    deleteYjsState(sceneId: string, projectId: string): Promise<void>;
}
