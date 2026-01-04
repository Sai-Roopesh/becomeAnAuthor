/**
 * Tauri Scene Codex Link Repository
 * Implements ISceneCodexLinkRepository using file system through Tauri commands
 */

import type { ISceneCodexLinkRepository } from '@/domain/repositories/ISceneCodexLinkRepository';
import type { SceneCodexLink, SceneCodexLinkRole } from '@/domain/entities/types';
import {
    listSceneCodexLinks,
    saveSceneCodexLink,
    deleteSceneCodexLink
} from '@/core/tauri';
import { TauriNodeRepository } from './TauriNodeRepository';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('TauriSceneCodexLinkRepository');

export class TauriSceneCodexLinkRepository implements ISceneCodexLinkRepository {
    private async getAllLinks(): Promise<SceneCodexLink[]> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return [];

        try {
            return await listSceneCodexLinks(projectPath);
        } catch (error) {
            log.error('Failed to list scene codex links:', error);
            return [];
        }
    }

    async getByScene(sceneId: string): Promise<SceneCodexLink[]> {
        const links = await this.getAllLinks();
        return links.filter(l => l.sceneId === sceneId);
    }

    async getByCodex(codexId: string): Promise<SceneCodexLink[]> {
        const links = await this.getAllLinks();
        return links.filter(l => l.codexId === codexId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getByProject(_projectId: string): Promise<SceneCodexLink[]> {
        return await this.getAllLinks();
    }

    async getByRole(_projectId: string, role: SceneCodexLinkRole): Promise<SceneCodexLink[]> {
        const links = await this.getAllLinks();
        return links.filter(l => l.role === role);
    }

    async exists(sceneId: string, codexId: string): Promise<boolean> {
        const links = await this.getAllLinks();
        return links.some(l => l.sceneId === sceneId && l.codexId === codexId);
    }

    async create(link: Omit<SceneCodexLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<SceneCodexLink> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const now = Date.now();
        const newLink: SceneCodexLink = {
            ...link,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };

        try {
            await saveSceneCodexLink(projectPath, newLink);
            return newLink;
        } catch (error) {
            log.error('Failed to create scene codex link:', error);
            throw error;
        }
    }

    async createMany(links: Omit<SceneCodexLink, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SceneCodexLink[]> {
        const results: SceneCodexLink[] = [];
        for (const link of links) {
            const created = await this.create(link);
            results.push(created);
        }
        return results;
    }

    async update(id: string, updates: Partial<Pick<SceneCodexLink, 'role'>>): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        const links = await this.getAllLinks();
        const existing = links.find(l => l.id === id);
        if (!existing) return;

        const updated: SceneCodexLink = {
            ...existing,
            ...updates,
            updatedAt: Date.now(),
        };

        try {
            await saveSceneCodexLink(projectPath, updated);
        } catch (error) {
            log.error('Failed to update scene codex link:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            await deleteSceneCodexLink(projectPath, id);
        } catch (error) {
            log.error('Failed to delete scene codex link:', error);
            throw error;
        }
    }

    async deleteByScene(sceneId: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            const links = await this.getByScene(sceneId);
            for (const link of links) {
                await deleteSceneCodexLink(projectPath, link.id);
            }
        } catch (error) {
            log.error('Failed to delete links by scene:', error);
            throw error;
        }
    }

    async deleteByCodex(codexId: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            const links = await this.getByCodex(codexId);
            for (const link of links) {
                await deleteSceneCodexLink(projectPath, link.id);
            }
        } catch (error) {
            log.error('Failed to delete links by codex:', error);
            throw error;
        }
    }

    async deleteAutoDetected(sceneId: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            const links = await this.getByScene(sceneId);
            for (const link of links.filter(l => l.autoDetected)) {
                await deleteSceneCodexLink(projectPath, link.id);
            }
        } catch (error) {
            log.error('Failed to delete auto-detected links:', error);
            throw error;
        }
    }
}
