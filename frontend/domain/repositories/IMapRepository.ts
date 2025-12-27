/**
 * Map Repository Interface
 * 
 * Abstraction for world map and marker persistence.
 */

import type { ProjectMap } from '@/domain/entities/types';

export interface IMapRepository {
    /**
     * List all maps for a project
     */
    list(projectId: string): Promise<ProjectMap[]>;

    /**
     * Save a map (create or update)
     */
    save(projectId: string, map: ProjectMap): Promise<void>;

    /**
     * Delete a map
     */
    delete(projectId: string, mapId: string): Promise<void>;

    /**
     * Upload an image for a map
     * @returns The path to the uploaded image relative to project root
     */
    uploadImage(projectId: string, mapId: string, imageData: number[], fileName: string): Promise<string>;
}
