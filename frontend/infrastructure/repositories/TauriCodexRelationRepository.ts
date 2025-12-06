/**
 * Tauri Codex Relation Repository
 * Implements ICodexRelationRepository using file system through Tauri commands
 */

import type { ICodexRelationRepository } from '@/domain/repositories/ICodexRelationRepository';
import type { CodexRelation } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexRelationRepository implements ICodexRelationRepository {
    async getByParent(parentId: string): Promise<CodexRelation[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const relations = await invoke<CodexRelation[]>('list_codex_relations', { projectPath });
            return relations.filter(r => r.parentId === parentId);
        } catch {
            return [];
        }
    }

    async create(relation: Partial<CodexRelation> & { parentId: string; childId: string }): Promise<CodexRelation> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const newRelation: CodexRelation = {
            id: crypto.randomUUID(),
            parentId: relation.parentId,
            childId: relation.childId,
            type: relation.type,
            strength: relation.strength,
            description: relation.description,
            tags: relation.tags,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await invoke('save_codex_relation', { projectPath, relation: newRelation });
        return newRelation;
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_codex_relation', { projectPath, relationId: id });
    }
}
