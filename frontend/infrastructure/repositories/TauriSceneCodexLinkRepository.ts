/**
 * Tauri Scene Codex Link Repository
 * Implements ISceneCodexLinkRepository using file system through Tauri commands
 */

import type { ISceneCodexLinkRepository } from '@/domain/repositories/ISceneCodexLinkRepository';
import type { SceneCodexLink, SceneCodexLinkRole } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriSceneCodexLinkRepository implements ISceneCodexLinkRepository {
    private async getAllLinks(): Promise<SceneCodexLink[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await invoke<SceneCodexLink[]>('list_scene_codex_links', { projectPath });
        } catch {
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

    async getByProject(projectId: string): Promise<SceneCodexLink[]> {
        return await this.getAllLinks();
    }

    async getByRole(projectId: string, role: SceneCodexLinkRole): Promise<SceneCodexLink[]> {
        const links = await this.getAllLinks();
        return links.filter(l => l.role === role);
    }

    async exists(sceneId: string, codexId: string): Promise<boolean> {
        const links = await this.getAllLinks();
        return links.some(l => l.sceneId === sceneId && l.codexId === codexId);
    }

    async create(link: Omit<SceneCodexLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<SceneCodexLink> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const now = Date.now();
        const newLink: SceneCodexLink = {
            ...link,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };

        await invoke('save_scene_codex_link', { projectPath, link: newLink });
        return newLink;
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
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const links = await this.getAllLinks();
        const existing = links.find(l => l.id === id);
        if (!existing) return;

        const updated: SceneCodexLink = {
            ...existing,
            ...updates,
            updatedAt: Date.now(),
        };

        await invoke('save_scene_codex_link', { projectPath, link: updated });
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_scene_codex_link', { projectPath, linkId: id });
    }

    async deleteByScene(sceneId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const links = await this.getByScene(sceneId);
        for (const link of links) {
            await invoke('delete_scene_codex_link', { projectPath, linkId: link.id });
        }
    }

    async deleteByCodex(codexId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const links = await this.getByCodex(codexId);
        for (const link of links) {
            await invoke('delete_scene_codex_link', { projectPath, linkId: link.id });
        }
    }

    async deleteAutoDetected(sceneId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const links = await this.getByScene(sceneId);
        for (const link of links.filter(l => l.autoDetected)) {
            await invoke('delete_scene_codex_link', { projectPath, linkId: link.id });
        }
    }
}
