import { invoke } from '@tauri-apps/api/core';
import type { IMentionRepository } from '@/domain/repositories/IMentionRepository';
import type { Mention } from '@/domain/entities/types';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('TauriMentionRepository');

/**
 * Tauri implementation of IMentionRepository
 * Follows Clean Architecture patterns - calls Rust backend commands
 */
export class TauriMentionRepository implements IMentionRepository {
    /**
     * Get all mentions of a codex entry
     */
    async getByCodexEntry(projectId: string, codexEntryId: string): Promise<Mention[]> {
        try {
            // projectId is the project path in the backend
            return await invoke<Mention[]>('find_mentions', {
                projectPath: projectId,
                codexEntryId,
            });
        } catch (error) {
            log.error('Failed to get mentions by codex entry:', error);
            return [];
        }
    }

    /**
     * Get count of mentions for a codex entry
     */
    async countByCodexEntry(projectId: string, codexEntryId: string): Promise<number> {
        try {
            return await invoke<number>('count_mentions', {
                projectPath: projectId,
                codexEntryId,
            });
        } catch (error) {
            log.error('Failed to count mentions by codex entry:', error);
            return 0;
        }
    }

    /**
     * Rebuild the mention index for a project
     * Currently not implemented server-side - mentions are computed on-demand
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async rebuildIndex(_projectId: string): Promise<void> {
        // No-op: Mentions are computed on-demand, not stored
        // Could be implemented for performance optimization in the future
    }

    /**
     * Get all mentions in a project grouped by codex entry
     * Not yet implemented - would need a new backend command
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getAllByProject(_projectId: string): Promise<Record<string, Mention[]>> {
        // Not implemented yet - would require backend support
        return {};
    }
}
