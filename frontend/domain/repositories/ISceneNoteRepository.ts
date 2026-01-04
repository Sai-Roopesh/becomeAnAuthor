/**
 * Scene Note Repository Interface
 * 
 * Abstraction for per-scene note persistence.
 */

import type { SceneNote } from '@/domain/entities/types';

export interface ISceneNoteRepository {
    /**
     * Get the note for a specific scene
     */
    getBySceneId(sceneId: string): Promise<SceneNote | null>;

    /**
     * Save a scene note (upsert - creates if not exists, updates if exists)
     * Uses sceneId as the unique key for upsert resolution
     * @param note - The scene note to save
     * @returns The saved scene note
     */
    save(note: SceneNote): Promise<SceneNote>;

    /**
     * Delete a scene note
     */
    delete(sceneId: string): Promise<void>;
}
