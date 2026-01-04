/**
 * Map Repository Interface
 * 
 * Abstraction for world map and marker persistence.
 */

import type { ProjectMap } from '@/domain/entities/types';

export interface IMapRepository {
    /**
     * List all maps for a project
     * @param projectId - Project ID to get maps for
     * @returns All maps in the project
     */
    list(projectId: string): Promise<ProjectMap[]>;

    /**
     * Save a map (upsert - creates if not exists, updates if exists)
     * @param projectId - Project ID the map belongs to
     * @param map - Map data to save
     */
    save(projectId: string, map: ProjectMap): Promise<void>;

    /**
     * Delete a map
     * @param projectId - Project ID the map belongs to
     * @param mapId - Map ID to delete
     */
    delete(projectId: string, mapId: string): Promise<void>;

    /**
     * Upload an image for a map
     * @param projectId - Project ID the map belongs to
     * @param mapId - Map ID to associate the image with
     * @param imageData - Image bytes as number array
     * @param fileName - Original file name
     * @returns The path to the uploaded image relative to project root
     */
    uploadImage(projectId: string, mapId: string, imageData: number[], fileName: string): Promise<string>;
}
