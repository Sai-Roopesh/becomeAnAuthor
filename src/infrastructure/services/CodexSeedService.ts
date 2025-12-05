import { db } from '@/lib/core/database';
import { BUILT_IN_TEMPLATES, BUILT_IN_RELATION_TYPES } from '@/lib/seed-data/built-in-templates';
import { serializeForStorage } from '@/infrastructure/repositories/repository-helpers';
import type { CodexTemplate, CodexRelationType } from '@/lib/config/types';

/**
 * Codex Seed Service
 * 
 * ✅ ARCHITECTURE COMPLIANCE:
 * - Service Layer Pattern (infrastructure/services)
 * - Singleton pattern for seed coordination
 * - Uses localStorage for HMR-resistant completion tracking
 * - Implements proper locking to prevent concurrent seeding
 * - Consistent boolean query syntax (isBuiltIn === 1)
 * 
 * This service replaces the old ad-hoc seedBuiltInData() function with:
 * - HMR resilience via localStorage tracking
 * - Explicit seed() and reset() methods
 * - Proper error handling and logging
 * - Thread-safe concurrent operations
 */

const SEED_STORAGE_KEY = 'codex_seed_completed_v2';
const SEED_LOCK_KEY = 'codex_seed_lock';

export class CodexSeedService {
    private static instance: CodexSeedService;

    /**
     * Get singleton instance
     */
    public static getInstance(): CodexSeedService {
        if (!CodexSeedService.instance) {
            CodexSeedService.instance = new CodexSeedService();
        }
        return CodexSeedService.instance;
    }

    /**
     * Check if seeding has been completed
     * Uses localStorage to persist across HMR
     */
    private isCompleted(): boolean {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(SEED_STORAGE_KEY) === 'true';
    }

    /**
     * Mark seeding as completed
     */
    private markCompleted(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(SEED_STORAGE_KEY, 'true');
        }
    }

    /**
     * Acquire lock for seeding operation
     * Prevents concurrent seeding attempts
     */
    private async acquireLock(): Promise<boolean> {
        if (typeof window === 'undefined') return false;

        const lockValue = localStorage.getItem(SEED_LOCK_KEY);
        if (lockValue) {
            const lockTime = parseInt(lockValue, 10);
            const now = Date.now();

            // If lock is older than 30 seconds, consider it stale and override
            if (now - lockTime < 30000) {
                return false;
            }
        }

        localStorage.setItem(SEED_LOCK_KEY, Date.now().toString());
        return true;
    }

    /**
     * Release lock
     */
    private releaseLock(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SEED_LOCK_KEY);
        }
    }

    /**
     * Seed built-in templates
     * Returns number of templates added
     */
    private async seedTemplates(): Promise<number> {
        // Query existing built-in templates
        // ✅ FIX: Use === 1 instead of === true for Dexie boolean index
        const existingTemplates = await db.codexTemplates
            .where('isBuiltIn')
            .equals(1)
            .toArray();

        // Create a Set of existing template keys for fast lookup
        const existingTemplateKeys = new Set(
            existingTemplates.map(t => `${t.name}|${t.category}`)
        );

        let templatesAdded = 0;

        for (const templateData of BUILT_IN_TEMPLATES) {
            const key = `${templateData.name}|${templateData.category}`;

            if (!existingTemplateKeys.has(key)) {
                const newTemplate: CodexTemplate = {
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    ...templateData
                };

                // ✅ CRITICAL: Serialize before storage (architectural rule)
                const cleanTemplate = serializeForStorage(newTemplate);
                await db.codexTemplates.add(cleanTemplate);
                templatesAdded++;
                existingTemplateKeys.add(key); // Prevent dupes in same run
            }
        }

        return templatesAdded;
    }

    /**
     * Seed built-in relation types
     * Returns number of relation types added
     */
    private async seedRelationTypes(): Promise<number> {
        // ✅ FIX: Use === 1 instead of === true for Dexie boolean index
        const existingTypes = await db.codexRelationTypes
            .where('isBuiltIn')
            .equals(1)
            .toArray();

        const existingTypeKeys = new Set(
            existingTypes.map(t => `${t.name}|${t.category}`)
        );

        let relationTypesAdded = 0;

        for (const relationType of BUILT_IN_RELATION_TYPES) {
            const key = `${relationType.name}|${relationType.category}`;

            if (!existingTypeKeys.has(key)) {
                const newRelationType: CodexRelationType = {
                    id: crypto.randomUUID(),
                    ...relationType
                };

                // ✅ CRITICAL: Serialize before storage
                const cleanRelationType = serializeForStorage(newRelationType);
                await db.codexRelationTypes.add(cleanRelationType);
                relationTypesAdded++;
                existingTypeKeys.add(key);
            }
        }

        return relationTypesAdded;
    }

    /**
     * Main seeding function
     * Idempotent and safe to call multiple times
     * 
     * @returns true if seeding ran, false if skipped
     */
    public async seed(): Promise<boolean> {
        // Check if already completed
        if (this.isCompleted()) {
            console.log('ℹ️ Codex seeding already completed, skipping');
            return false;
        }

        // Try to acquire lock
        const acquired = await this.acquireLock();
        if (!acquired) {
            console.log('⏳ Codex seeding in progress by another process, skipping');
            return false;
        }

        try {
            console.log('🌱 Starting codex seeding...');

            // Use transaction for atomicity
            await db.transaction('rw', [db.codexTemplates, db.codexRelationTypes], async () => {
                const templatesAdded = await this.seedTemplates();
                const relationTypesAdded = await this.seedRelationTypes();

                if (templatesAdded > 0) {
                    console.log(`✅ Seeded ${templatesAdded} new built-in templates`);
                } else {
                    console.log('ℹ️ All built-in templates already exist');
                }

                if (relationTypesAdded > 0) {
                    console.log(`✅ Seeded ${relationTypesAdded} new built-in relation types`);
                } else {
                    console.log('ℹ️ All built-in relation types already exist');
                }
            });

            // Mark as completed
            this.markCompleted();
            console.log('✅ Codex seeding completed');

            return true;

        } catch (error) {
            console.error('❌ Failed to seed built-in data:', error);
            throw error; // Re-throw so caller can handle
        } finally {
            this.releaseLock();
        }
    }

    /**
     * Reset seeding status
     * Forces re-seeding on next seed() call
     * Useful for development/testing
     */
    public reset(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SEED_STORAGE_KEY);
            console.log('🔄 Codex seed status reset');
        }
    }

    /**
     * Check if seeding is needed
     */
    public needsSeeding(): boolean {
        return !this.isCompleted();
    }
}

/**
 * Export singleton instance
 */
export const codexSeedService = CodexSeedService.getInstance();
