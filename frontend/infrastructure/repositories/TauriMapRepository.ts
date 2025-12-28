/**
 * Tauri Map Repository
 * Implements IMapRepository using Tauri commands
 */

import type { IMapRepository } from '@/domain/repositories/IMapRepository';
import type { ProjectMap } from '@/domain/entities/types';
import {
    listMaps,
    saveMap,
    deleteMap,
    uploadMapImage
} from '@/core/tauri/commands';
import { TauriNodeRepository } from './TauriNodeRepository';

export class TauriMapRepository implements IMapRepository {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async list(_projectId: string): Promise<ProjectMap[]> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return [];

        try {
            return await listMaps(projectPath);
        } catch (error) {
            console.error('Failed to list maps:', error);
            return [];
        }
    }

    async save(projectId: string, map: ProjectMap): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        try {
            await saveMap(projectPath, {
                ...map,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Failed to save map:', error);
            throw error;
        }
    }

    async delete(projectId: string, mapId: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            await deleteMap(projectPath, mapId);
        } catch (error) {
            console.error('Failed to delete map:', error);
            throw error;
        }
    }

    async uploadImage(projectId: string, mapId: string, imageData: number[], fileName: string): Promise<string> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        try {
            return await uploadMapImage(projectPath, mapId, imageData, fileName);
        } catch (error) {
            console.error('Failed to upload map image:', error);
            throw error;
        }
    }
}
