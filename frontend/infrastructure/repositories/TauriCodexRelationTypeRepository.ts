/**
 * Tauri Codex Relation Type Repository
 * Implements ICodexRelationTypeRepository using file system through Tauri commands
 */

import type { ICodexRelationTypeRepository } from '@/domain/repositories/ICodexRelationTypeRepository';
import type { CodexRelationType } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexRelationTypeRepository implements ICodexRelationTypeRepository {
    async get(id: string): Promise<CodexRelationType | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        try {
            const types = await invoke<CodexRelationType[]>('list_codex_relation_types', { projectPath });
            return types.find(t => t.id === id);
        } catch {
            return undefined;
        }
    }

    async getAll(): Promise<CodexRelationType[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await invoke<CodexRelationType[]>('list_codex_relation_types', { projectPath });
        } catch {
            return [];
        }
    }

    async getByCategory(category: string): Promise<CodexRelationType[]> {
        const types = await this.getAll();
        return types.filter(t => t.category === category);
    }

    async getBuiltIn(): Promise<CodexRelationType[]> {
        const types = await this.getAll();
        return types.filter(t => t.isBuiltIn);
    }

    async create(type: Omit<CodexRelationType, 'id'>): Promise<CodexRelationType> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const newType: CodexRelationType = {
            ...type,
            id: crypto.randomUUID(),
        };

        await invoke('save_codex_relation_type', { projectPath, relationType: newType });
        return newType;
    }

    async update(id: string, data: Partial<CodexRelationType>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated = { ...existing, ...data };
        await invoke('save_codex_relation_type', { projectPath, relationType: updated });
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_codex_relation_type', { projectPath, typeId: id });
    }
}
