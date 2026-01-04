/**
 * Tauri Idea Repository
 * Implements IdeaRepository using file system through Tauri commands
 */

import type { IIdeaRepository } from '@/domain/repositories/IIdeaRepository';
import type { Idea } from '@/domain/entities/types';
import {
    listIdeas,
    createIdea,
    updateIdea,
    deleteIdea
} from '@/core/tauri';
import { TauriNodeRepository } from './TauriNodeRepository';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('TauriIdeaRepository');

/**
 * Tauri-based Idea Repository
 * Stores ideas as a JSON array in ~/BecomeAnAuthor/Projects/{project}/ideas.json
 */
export class TauriIdeaRepository implements IIdeaRepository {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async list(_projectId: string): Promise<Idea[]> {
        // projectId is for interface consistency; actual path comes from singleton
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return [];

        try {
            return await listIdeas(projectPath);
        } catch (error) {
            log.error('Failed to list ideas:', error);
            return [];
        }
    }

    async create(ideaData: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>): Promise<Idea> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        const now = Date.now();
        const idea: Idea = {
            id: crypto.randomUUID(),
            ...ideaData,
            createdAt: now,
            updatedAt: now,
        };

        try {
            return await createIdea(projectPath, idea);
        } catch (error) {
            log.error('Failed to create idea:', error);
            throw error;
        }
    }

    async update(idea: Idea): Promise<Idea> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        try {
            return await updateIdea(projectPath, {
                ...idea,
                updatedAt: Date.now(),
            });
        } catch (error) {
            log.error('Failed to update idea:', error);
            throw error;
        }
    }

    async delete(ideaId: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            await deleteIdea(projectPath, ideaId);
        } catch (error) {
            log.error('Failed to delete idea:', error);
            throw error;
        }
    }
}
