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
} from '@/core/tauri';
import { TauriNodeRepository } from './TauriNodeRepository';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('TauriCodexRelationRepository');

export class TauriCodexRelationRepository implements ICodexRelationRepository {
    async getByParent(parentId: string): Promise<CodexRelation[]> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return [];

        try {
            const relations = await listCodexRelations(projectPath);
            return relations.filter(r => r.parentId === parentId);
        } catch (error) {
            log.error('Failed to list codex relations:', error);
            return [];
        }
    }

    async create(relation: Partial<CodexRelation> & { parentId: string; childId: string }): Promise<CodexRelation> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const now = Date.now();
        const newRelation: CodexRelation = {
            id: crypto.randomUUID(),
            parentId: relation.parentId,
            childId: relation.childId,
            projectId: relation.projectId || 'current',  // Get from context
            ...(relation.typeId !== undefined && { typeId: relation.typeId }),
            ...(relation.label !== undefined && { label: relation.label }),
            ...(relation.strength !== undefined && { strength: relation.strength }),
            createdAt: now,
            updatedAt: now,
        };

        try {
            await saveCodexRelation(projectPath, newRelation);
            return newRelation;
        } catch (error) {
            log.error('Failed to save codex relation:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const projectPath = TauriNodeRepository.getInstance().getProjectPath();
        if (!projectPath) return;

        try {
            await deleteCodexRelation(projectPath, id);
        } catch (error) {
            log.error('Failed to delete codex relation:', error);
            throw error;
        }
    }
}
