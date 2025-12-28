/**
 * Tauri World Timeline Repository
 * Implements IWorldTimelineRepository using Tauri commands
 */

import type { IWorldTimelineRepository } from '@/domain/repositories/IWorldTimelineRepository';
import type { WorldEvent } from '@/domain/entities/types';
import {
    listWorldEvents,
    saveWorldEvent,
    deleteWorldEvent
} from '@/core/tauri/commands';
import { TauriNodeRepository } from './TauriNodeRepository';

export class TauriWorldTimelineRepository implements IWorldTimelineRepository {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async list(_projectId: string): Promise<WorldEvent[]> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return [];

        try {
            return await listWorldEvents(projectPath);
        } catch (error) {
            console.error('Failed to list world events:', error);
            return [];
        }
    }

    async save(_projectId: string, event: WorldEvent): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        try {
            await saveWorldEvent(projectPath, {
                ...event,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Failed to save world event:', error);
            throw error;
        }
    }

    async delete(_projectId: string, eventId: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            await deleteWorldEvent(projectPath, eventId);
        } catch (error) {
            console.error('Failed to delete world event:', error);
            throw error;
        }
    }
}
