/**
 * Tauri Codex Relation Type Repository
 * Implements ICodexRelationTypeRepository using file system through Tauri commands
 */

import type { ICodexRelationTypeRepository } from '@/domain/repositories/ICodexRelationTypeRepository';
import type { CodexRelationType } from '@/domain/entities/types';
import {
    listCodexRelationTypes,
    saveCodexRelationType,
    deleteCodexRelationType
} from '@/lib/tauri';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexRelationTypeRepository implements ICodexRelationTypeRepository {
    async get(id: string): Promise<CodexRelationType | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        try {
            const types = await listCodexRelationTypes(projectPath) as unknown as CodexRelationType[];
            return types.find(t => t.id === id);
        } catch (error) {
            console.error('Failed to get codex relation type:', error);
            return undefined;
        }
    }

    async getAll(): Promise<CodexRelationType[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await listCodexRelationTypes(projectPath) as unknown as CodexRelationType[];
        } catch (error) {
            console.error('Failed to list codex relation types:', error);
            return [];
        }
    }

    async getByCategory(category: string): Promise<CodexRelationType[]> {
        const types = await this.getAll();
        return types.filter(t => (t as any).category === category);
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
        } as CodexRelationType;

        try {
            await saveCodexRelationType(projectPath, newType as any);
            return newType;
        } catch (error) {
            console.error('Failed to create codex relation type:', error);
            throw error;
        }
    }

    async update(id: string, data: Partial<CodexRelationType>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated = { ...existing, ...data };
        try {
            await saveCodexRelationType(projectPath, updated as any);
        } catch (error) {
            console.error('Failed to update codex relation type:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            await deleteCodexRelationType(projectPath, id);
        } catch (error) {
            console.error('Failed to delete codex relation type:', error);
            throw error;
        }
    }
}
