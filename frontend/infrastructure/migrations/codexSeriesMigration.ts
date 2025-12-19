/**
 * Codex Migration Utilities
 * Frontend wrappers for codex storage migration commands
 * 
 * Phase 1.1C: Migrates codex entries from project storage to series storage
 */

import { invoke } from '@tauri-apps/api/core';

export interface CodexMigrationResult {
    totalProjects: number;
    totalEntries: number;
    migratedEntries: number;
    skippedEntries: number;
    errors: string[];
    seriesAffected: string[];
}

/**
 * Migrate all codex entries from project storage to series storage
 * 
 * OLD: ~/BecomeAnAuthor/Projects/{project}/codex/
 * NEW: ~/BecomeAnAuthor/Series/{series_id}/codex/
 * 
 * This is a safe operation - it copies entries (doesn't delete originals)
 * Deduplicates entries by ID (skips if already exists in series storage)
 * 
 * @returns Migration statistics including entries migrated and any errors
 */
export async function migrateCodexToSeries(): Promise<CodexMigrationResult> {
    return invoke<CodexMigrationResult>('migrate_codex_to_series');
}

/**
 * Cleanup old codex directories after successful migration
 * 
 * WARNING: This is destructive! Only call after verifying migration success.
 * Deletes old {project}/codex/ directories.
 * 
 * @returns Number of codex directories deleted
 */
export async function cleanupOldCodex(): Promise<number> {
    return invoke<number>('cleanup_old_codex');
}

/**
 * Emergency rollback: Restore codex from series storage back to project storage
 * 
 * Use this if migration causes issues. Copies entries from series storage
 * back to individual project directories.
 * 
 * @returns Number of entries restored
 */
export async function rollbackCodexMigration(): Promise<number> {
    return invoke<number>('rollback_codex_migration');
}
