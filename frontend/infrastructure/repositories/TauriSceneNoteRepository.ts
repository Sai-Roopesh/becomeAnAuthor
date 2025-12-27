/**
 * Tauri Scene Note Repository
 * Implements SceneNoteRepository using Tauri commands
 */

import type { ISceneNoteRepository } from '@/domain/repositories/ISceneNoteRepository';
import type { SceneNote } from '@/domain/entities/types';
import {
    getSceneNote,
    saveSceneNote,
    deleteSceneNote
} from '@/core/tauri';
import { TauriNodeRepository } from './TauriNodeRepository';

export class TauriSceneNoteRepository implements ISceneNoteRepository {
    async getBySceneId(sceneId: string): Promise<SceneNote | null> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return null;

        try {
            return await getSceneNote(projectPath, sceneId);
        } catch (error) {
            console.error('Failed to get scene note:', error);
            return null;
        }
    }

    async save(note: SceneNote): Promise<SceneNote> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        try {
            const updatedNote = {
                ...note,
                updatedAt: Date.now()
            };
            await saveSceneNote(projectPath, updatedNote);
            return updatedNote;
        } catch (error) {
            console.error('Failed to save scene note:', error);
            throw error;
        }
    }

    async delete(sceneId: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            await deleteSceneNote(projectPath, sceneId);
        } catch (error) {
            console.error('Failed to delete scene note:', error);
            throw error;
        }
    }
}
