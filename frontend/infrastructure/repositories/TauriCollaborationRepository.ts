/**
 * Tauri Collaboration Repository
 * 
 * Implements ICollaborationRepository using Tauri commands.
 * Per CODING_GUIDELINES.md: Layer 5 - Tauri Repository
 * 
 * NOTE: Tauri 2.0 auto-converts Rust snake_case params to JS camelCase.
 * So Rust `project_path` becomes JS `projectPath`.
 */

import type { ICollaborationRepository } from '@/domain/repositories/ICollaborationRepository';
import type { YjsStateSnapshot } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/shared/utils/logger';
import { TauriNodeRepository } from './TauriNodeRepository';

const log = logger.scope('TauriCollaborationRepository');

export class TauriCollaborationRepository implements ICollaborationRepository {
    private static instance: TauriCollaborationRepository | null = null;

    private constructor() { }

    static getInstance(): TauriCollaborationRepository {
        if (!TauriCollaborationRepository.instance) {
            TauriCollaborationRepository.instance = new TauriCollaborationRepository();
        }
        return TauriCollaborationRepository.instance;
    }

    private getProjectPath(): string | null {
        return TauriNodeRepository.getInstance().getProjectPath();
    }

    async saveYjsState(sceneId: string, _projectId: string, update: Uint8Array): Promise<void> {
        const projectPath = this.getProjectPath();
        if (!projectPath) {
            log.debug('Cannot save Yjs state: No project path set');
            return;
        }

        try {
            // Convert Uint8Array to number array for JSON serialization
            const updateArray = Array.from(update);
            // Tauri auto-converts snake_case to camelCase
            await invoke('save_yjs_state', {
                projectPath,
                sceneId,
                update: updateArray
            });
            log.debug('Saved Yjs state', { sceneId });
        } catch (error) {
            log.error('Failed to save Yjs state', error);
            throw error;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async loadYjsState(sceneId: string, _projectId: string): Promise<YjsStateSnapshot | null> {
        const projectPath = this.getProjectPath();
        if (!projectPath) {
            log.debug('Cannot load Yjs state: No project path set');
            return null;
        }

        try {
            const result = await invoke<{
                sceneId: string;
                projectId: string;
                update: number[];
                savedAt: number;
            } | null>('load_yjs_state', {
                projectPath,
                sceneId
            });

            if (!result) return null;

            return {
                sceneId: result.sceneId,
                projectId: result.projectId,
                stateVector: new Uint8Array([]), // Will be computed from update
                update: new Uint8Array(result.update),
                savedAt: result.savedAt
            };
        } catch (error) {
            log.error('Failed to load Yjs state', error);
            return null;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async hasYjsState(sceneId: string, _projectId: string): Promise<boolean> {
        const projectPath = this.getProjectPath();
        if (!projectPath) return false;

        try {
            return await invoke<boolean>('has_yjs_state', {
                projectPath,
                sceneId
            });
        } catch {
            return false;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteYjsState(sceneId: string, _projectId: string): Promise<void> {
        const projectPath = this.getProjectPath();
        if (!projectPath) {
            log.debug('Cannot delete Yjs state: No project path set');
            return;
        }

        try {
            await invoke('delete_yjs_state', {
                projectPath,
                sceneId
            });
            log.debug('Deleted Yjs state', { sceneId });
        } catch (error) {
            log.error('Failed to delete Yjs state', error);
            throw error;
        }
    }
}

// Export singleton instance
export const collaborationRepository = TauriCollaborationRepository.getInstance();
