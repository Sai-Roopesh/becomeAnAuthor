/**
 * Tauri Codex Template Repository
 * Implements ICodexTemplateRepository using file system through Tauri commands
 */

import type { ICodexTemplateRepository } from '@/domain/repositories/ICodexTemplateRepository';
import type { CodexTemplate, CodexCategory } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexTemplateRepository implements ICodexTemplateRepository {
    async get(id: string): Promise<CodexTemplate | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        try {
            const templates = await invoke<CodexTemplate[]>('list_codex_templates', { projectPath });
            return templates.find(t => t.id === id);
        } catch {
            return undefined;
        }
    }

    async getByCategory(category: CodexCategory): Promise<CodexTemplate[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const templates = await invoke<CodexTemplate[]>('list_codex_templates', { projectPath });
            return templates.filter(t => t.category === category);
        } catch {
            return [];
        }
    }

    async getBuiltInTemplates(): Promise<CodexTemplate[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const templates = await invoke<CodexTemplate[]>('list_codex_templates', { projectPath });
            return templates.filter(t => t.isBuiltIn);
        } catch {
            return [];
        }
    }

    async getCustomTemplates(projectId: string): Promise<CodexTemplate[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const templates = await invoke<CodexTemplate[]>('list_codex_templates', { projectPath });
            return templates.filter(t => !t.isBuiltIn);
        } catch {
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
        };

        await invoke('save_codex_template', { projectPath, template: newTemplate });
        return newTemplate;
    }

    async update(id: string, data: Partial<CodexTemplate>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated = { ...existing, ...data };
        await invoke('save_codex_template', { projectPath, template: updated });
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_codex_template', { projectPath, templateId: id });
    }
}
