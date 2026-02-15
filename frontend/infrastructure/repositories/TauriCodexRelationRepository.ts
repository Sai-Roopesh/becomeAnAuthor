/**
 * Tauri Codex Relation Repository
 * Implements ICodexRelationRepository using file system through Tauri commands
 */

import type { ICodexRelationRepository } from '@/domain/repositories/ICodexRelationRepository';
import type { CodexRelation } from '@/domain/entities/types';
import {
    listSeriesCodexRelations,
    saveSeriesCodexRelation,
    deleteSeriesCodexRelation
} from '@/core/tauri';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('TauriCodexRelationRepository');

export class TauriCodexRelationRepository implements ICodexRelationRepository {
    async getByParent(seriesId: string, parentId: string): Promise<CodexRelation[]> {
        if (!seriesId) return [];

        try {
            const relations = await listSeriesCodexRelations(seriesId);
            return relations.filter(r => r.parentId === parentId);
        } catch (error) {
            log.error('Failed to list codex relations:', error);
            return [];
        }
    }

    async create(seriesId: string, relation: Partial<CodexRelation> & { parentId: string; childId: string }): Promise<CodexRelation> {
        if (!seriesId) throw new Error('Series ID is required');

        const now = Date.now();
        const newRelation: CodexRelation = {
            id: crypto.randomUUID(),
            parentId: relation.parentId,
            childId: relation.childId,
            ...(relation.projectId !== undefined && { projectId: relation.projectId }),
            ...(relation.typeId !== undefined && { typeId: relation.typeId }),
            ...(relation.label !== undefined && { label: relation.label }),
            ...(relation.strength !== undefined && { strength: relation.strength }),
            createdAt: now,
            updatedAt: now,
        };

        try {
            await saveSeriesCodexRelation(seriesId, newRelation);
            return newRelation;
        } catch (error) {
            log.error('Failed to save codex relation:', error);
            throw error;
        }
    }

    async delete(seriesId: string, id: string): Promise<void> {
        if (!seriesId) return;

        try {
            await deleteSeriesCodexRelation(seriesId, id);
        } catch (error) {
            log.error('Failed to delete codex relation:', error);
            throw error;
        }
    }
}
