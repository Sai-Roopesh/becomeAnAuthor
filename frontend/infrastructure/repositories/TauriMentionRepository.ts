import { invoke } from '@tauri-apps/api/core';
import type { IMentionRepository } from '@/domain/repositories/IMentionRepository';
import type { Mention } from '@/domain/entities/types';

/**
 * Tauri implementation of IMentionRepository
 * Follows Clean Architecture patterns - calls Rust backend commands
 */
export class TauriMentionRepository implements IMentionRepository {
    /**
     * Get all mentions of a codex entry
     */
    async getByCodexEntry(projectId: string, codexEntryId: string): Promise<Mention[]> {
        // projectId is the project path in the backend
        return await invoke<Mention[]>('find_mentions', {
            projectPath: projectId,
            codexEntryId,
        });
    }

    /**
     * Get count of mentions for a codex entry
     */
    async countByCodexEntry(projectId: string, codexEntryId: string): Promise<number> {
        return await invoke<number>('count_mentions', {
            projectPath: projectId,
            codexEntryId,
        });
    }

    /**
     * Rebuild the mention index for a project
     * Currently not implemented server-side - mentions are computed on-demand
     */
    async rebuildIndex(_projectId: string): Promise<void> {
        // No-op: Mentions are computed on-demand, not stored
        // Could be implemented for performance optimization in the future
    }

    /**
     * Get all mentions in a project grouped by codex entry
     * Not yet implemented - would need a new backend command
     */
    async getAllByProject(_projectId: string): Promise<Record<string, Mention[]>> {
        // Not implemented yet - would require backend support
        return {};
    }
}

// Singleton instance
let instance: TauriMentionRepository | null = null;

export function getMentionRepository(): IMentionRepository {
    if (!instance) {
        instance = new TauriMentionRepository();
    }
    return instance;
}
