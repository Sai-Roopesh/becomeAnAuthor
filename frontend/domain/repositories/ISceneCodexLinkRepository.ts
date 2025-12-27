import type { SceneCodexLink, SceneCodexLinkRole } from '@/domain/entities/types';

/**
 * Repository interface for Scene-Codex Links
 * Enables tracking which codex entries (characters, locations, plots) appear in which scenes
 */
export interface ISceneCodexLinkRepository {
    /**
     * Get all links for a specific scene
     */
    getByScene(sceneId: string): Promise<SceneCodexLink[]>;

    /**
     * Get all links for a specific codex entry (find all scenes where it appears)
     */
    getByCodex(codexId: string): Promise<SceneCodexLink[]>;

    /**
     * Get all links for a project
     */
    getByProject(projectId: string): Promise<SceneCodexLink[]>;

    /**
     * Get links filtered by role (e.g., all 'pov' links)
     */
    getByRole(projectId: string, role: SceneCodexLinkRole): Promise<SceneCodexLink[]>;

    /**
     * Check if a specific scene-codex link exists
     */
    exists(sceneId: string, codexId: string): Promise<boolean>;

    /**
     * Create a new scene-codex link
     */
    create(link: Omit<SceneCodexLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<SceneCodexLink>;

    /**
     * Create multiple links at once (for batch operations like @mention detection)
     */
    createMany(links: Omit<SceneCodexLink, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SceneCodexLink[]>;

    /**
     * Update an existing link
     */
    update(id: string, updates: Partial<Pick<SceneCodexLink, 'role'>>): Promise<void>;

    /**
     * Delete a link by ID
     */
    delete(id: string): Promise<void>;

    /**
     * Delete all links for a scene (useful when scene is deleted)
     */
    deleteByScene(sceneId: string): Promise<void>;

    /**
     * Delete all links for a codex entry (useful when codex entry is deleted)
     */
    deleteByCodex(codexId: string): Promise<void>;

    /**
     * Delete all auto-detected links for a scene (for re-detection)
     */
    deleteAutoDetected(sceneId: string): Promise<void>;
}
