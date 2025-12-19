/**
 * Migration script for Codex Arcs Module
 * Migrates existing CodexEntries to support arc points
 */

import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';

export interface MigrationResult {
    migrated: number;
    skipped: number;
    errors: Array<{ entryId: string; error: string }>;
}

/**
 * Migrate codex entries in a series to support arc points
 * - Moves description to coreDescription
 * - Creates initial arc point from first book
 */
export async function migrateCodexToArcs(
    codexRepo: ICodexRepository,
    projectRepo: IProjectRepository,
    seriesId: string
): Promise<MigrationResult> {
    const result: MigrationResult = {
        migrated: 0,
        skipped: 0,
        errors: [],
    };

    try {
        // Get all entries in series
        const entries = await codexRepo.getBySeries(seriesId);

        // Get all projects in series (sorted by index)
        const allProjects = await projectRepo.getAll();
        const projects = allProjects.filter(p => p.seriesId === seriesId);
        const sortedProjects = projects.sort((a, b) => {
            const aIdx = parseInt(a.seriesIndex?.match(/\d+/)?.[0] || '999');
            const bIdx = parseInt(b.seriesIndex?.match(/\d+/)?.[0] || '999');
            return aIdx - bIdx;
        });

        const firstBook = sortedProjects[0];
        if (!firstBook) {
            console.warn(`No books found in series ${seriesId}`);
            return result;
        }

        // Migrate each entry
        for (const entry of entries) {
            try {
                // Skip if already has arc points
                if (entry.arcPoints && entry.arcPoints.length > 0) {
                    result.skipped++;
                    continue;
                }

                // Move description to coreDescription if not set
                const coreDescription = entry.coreDescription || entry.description || `${entry.category} in series`;

                // Create initial arc point from first book
                await codexRepo.addArcPoint(seriesId, entry.id, {
                    eventType: 'book',
                    eventLabel: `${firstBook.title} - Beginning`,
                    bookId: firstBook.id,
                    timestamp: 0, // Initial state
                    description: entry.description || coreDescription,
                    stats: {},
                    relationships: {},
                });

                // Update core description
                await codexRepo.update(entry.id, {
                    coreDescription,
                });

                result.migrated++;
            } catch (error) {
                result.errors.push({
                    entryId: entry.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return result;
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

/**
 * Check if series needs migration
 */
export async function needsMigration(
    codexRepo: ICodexRepository,
    seriesId: string
): Promise<boolean> {
    const entries = await codexRepo.getBySeries(seriesId);

    // Check if any entry lacks arc points
    return entries.some(entry => !entry.arcPoints || entry.arcPoints.length === 0);
}
