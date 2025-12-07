/**
 * Tauri Codex Template Repository
 * Implements ICodexTemplateRepository using file system through Tauri commands
 */

import type { ICodexTemplateRepository } from '@/domain/repositories/ICodexTemplateRepository';
import type { CodexTemplate, CodexCategory } from '@/domain/entities/types';
import {
    listCodexTemplates,
    saveCodexTemplate,
    deleteCodexTemplate
} from '@/lib/tauri';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexTemplateRepository implements ICodexTemplateRepository {
    async get(id: string): Promise<CodexTemplate | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        try {
            const templates = await listCodexTemplates(projectPath) as unknown as CodexTemplate[];
            return templates.find(t => t.id === id);
        } catch (error) {
            console.error('Failed to get codex template:', error);
            return undefined;
        }
    }

    async getByCategory(category: CodexCategory): Promise<CodexTemplate[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const templates = await listCodexTemplates(projectPath) as unknown as CodexTemplate[];
            return templates.filter(t => t.category === category);
        } catch (error) {
            console.error('Failed to list codex templates by category:', error);
            return [];
        }
    }

    async getBuiltInTemplates(): Promise<CodexTemplate[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const templates = await listCodexTemplates(projectPath) as unknown as CodexTemplate[];
            return templates.filter(t => t.isBuiltIn);
        } catch (error) {
            console.error('Failed to get built-in templates:', error);
            return [];
        }
    }

    async getCustomTemplates(projectId: string): Promise<CodexTemplate[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const templates = await listCodexTemplates(projectPath) as unknown as CodexTemplate[];
            return templates.filter(t => !t.isBuiltIn);
        } catch (error) {
            console.error('Failed to get custom templates:', error);
            return [];
        }
    }

    async create(template: Omit<CodexTemplate, 'id' | 'createdAt'>): Promise<CodexTemplate> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const newTemplate: CodexTemplate = {
            ...template,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        } as CodexTemplate;

        try {
            await saveCodexTemplate(projectPath, newTemplate as any);
            return newTemplate;
        } catch (error) {
            console.error('Failed to create codex template:', error);
            throw error;
        }
    }

    async update(id: string, data: Partial<CodexTemplate>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated = { ...existing, ...data };
        try {
            await saveCodexTemplate(projectPath, updated as any);
        } catch (error) {
            console.error('Failed to update codex template:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            await deleteCodexTemplate(projectPath, id);
        } catch (error) {
            console.error('Failed to delete codex template:', error);
            throw error;
        }
    }
}
