/**
 * Tauri Codex Relation Repository
 * Implements ICodexRelationRepository using file system through Tauri commands
 */

import type { ICodexRelationRepository } from '@/domain/repositories/ICodexRelationRepository';
import type { CodexRelation } from '@/domain/entities/types';
import {
    listCodexRelations,
    saveCodexRelation,
    deleteCodexRelation
} from '@/lib/tauri';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriCodexRelationRepository implements ICodexRelationRepository {
    async getByParent(parentId: string): Promise<CodexRelation[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            const relations = await listCodexRelations(projectPath) as unknown as CodexRelation[];
            return relations.filter(r => r.parentId === parentId);
        } catch (error) {
            console.error('Failed to list codex relations:', error);
            return [];
        }
    }

    async create(relation: Partial<CodexRelation> & { parentId: string; childId: string }): Promise<CodexRelation> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const now = Date.now();
        const newRelation: CodexRelation = {
            id: crypto.randomUUID(),
            parentId: relation.parentId,
            childId: relation.childId,
            projectId: relation.projectId || 'current',  // Get from context
            typeId: relation.typeId,
            label: relation.label,
            strength: relation.strength,
            createdAt: now,
            updatedAt: now,
        };

        try {
            await saveCodexRelation(projectPath, newRelation as any);
            return newRelation;
        } catch (error) {
            console.error('Failed to save codex relation:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            await deleteCodexRelation(projectPath, id);
        } catch (error) {
            console.error('Failed to delete codex relation:', error);
            throw error;
        }
    }
}
