import { db } from '@/lib/core/database';
import type { CodexTemplate, CodexRelationType } from '@/lib/config/types';

/**
 * Codex Data Utilities
 * 
 * ✅ ARCHITECTURE COMPLIANCE:
 * - Located in lib/utils (general utilities)
 * - Can be used by repositories and maintenance scripts
 * - Provides data integrity and cleanup functions
 */

/**
 * Health report for database diagnostics
 */
export interface CodexHealthReport {
    templateStats: {
        total: number;
        builtin: number;
        custom: number;
        duplicates: number;
        duplicateDetails: Array<{ name: string; category: string; count: number }>;
    };
    relationTypeStats: {
        total: number;
        builtin: number;
        custom: number;
        duplicates: number;
        duplicateDetails: Array<{ name: string; category: string; count: number }>;
    };
    healthyState: boolean;
    issues: string[];
}

/**
 * Deduplicates an array of templates by name+category
 * Keeps the oldest template (earliest createdAt)
 * 
 * @param templates - Array of templates to deduplicate
 * @returns Deduplicated array
 */
export function deduplicateTemplates(templates: CodexTemplate[]): CodexTemplate[] {
    const seen = new Map<string, CodexTemplate>();

    for (const template of templates) {
        const key = `${template.name}|${template.category}`;
        const existing = seen.get(key);

        if (!existing || template.createdAt < existing.createdAt) {
            // Keep the oldest one
            seen.set(key, template);
        }
    }

    return Array.from(seen.values());
}

/**
 * Deduplicates an array of relation types by name+category
 * Keeps the first occurrence
 * 
 * @param types - Array of relation types to deduplicate
 * @returns Deduplicated array
 */
export function deduplicateRelationTypes(types: CodexRelationType[]): CodexRelationType[] {
    const seen = new Map<string, CodexRelationType>();

    for (const type of types) {
        const key = `${type.name}|${type.category}`;
        if (!seen.has(key)) {
            seen.set(key, type);
        }
    }

    return Array.from(seen.values());
}

/**
 * Validates a template has all required fields
 * 
 * @param template - Template to validate
 * @returns true if valid, false otherwise
 */
export function validateTemplate(template: CodexTemplate): boolean {
    if (!template.id || !template.name || !template.category) {
        return false;
    }

    if (!Array.isArray(template.fields)) {
        return false;
    }

    if (typeof template.isBuiltIn !== 'boolean') {
        return false;
    }

    if (!template.createdAt || typeof template.createdAt !== 'number') {
        return false;
    }

    return true;
}

/**
 * Validates a relation type has all required fields
 * 
 * @param type - Relation type to validate
 * @returns true if valid, false otherwise
 */
export function validateRelationType(type: CodexRelationType): boolean {
    if (!type.id || !type.name || !type.category) {
        return false;
    }

    if (typeof type.isBuiltIn !== 'boolean' || typeof type.isDirectional !== 'boolean') {
        return false;
    }

    return true;
}

/**
 * Cleanup duplicate templates from database
 * Keeps the oldest template for each name+category combination
 * 
 * @returns Number of duplicates removed
 */
export async function cleanupDuplicateTemplates(): Promise<number> {
    const allTemplates = await db.codexTemplates.toArray();
    const uniqueTemplates = deduplicateTemplates(allTemplates);

    const toDelete = allTemplates.filter(
        t => !uniqueTemplates.some(u => u.id === t.id)
    );

    if (toDelete.length > 0) {
        await db.codexTemplates.bulkDelete(toDelete.map(t => t.id));
        console.log(`🧹 Cleaned up ${toDelete.length} duplicate templates:`,
            toDelete.map(t => `${t.name} (${t.category})`));
    }

    return toDelete.length;
}

/**
 * Cleanup duplicate relation types from database
 * Keeps the first occurrence for each name+category combination
 * 
 * @returns Number of duplicates removed
 */
export async function cleanupDuplicateRelationTypes(): Promise<number> {
    const allTypes = await db.codexRelationTypes.toArray();
    const uniqueTypes = deduplicateRelationTypes(allTypes);

    const toDelete = allTypes.filter(
        t => !uniqueTypes.some(u => u.id === t.id)
    );

    if (toDelete.length > 0) {
        await db.codexRelationTypes.bulkDelete(toDelete.map(t => t.id));
        console.log(`🧹 Cleaned up ${toDelete.length} duplicate relation types:`,
            toDelete.map(t => `${t.name} (${t.category})`));
    }

    return toDelete.length;
}

/**
 * Generate a comprehensive health report for the codex database
 * 
 * @returns Health report with statistics and issues
 */
export async function getDatabaseHealthReport(): Promise<CodexHealthReport> {
    const templates = await db.codexTemplates.toArray();
    const relationTypes = await db.codexRelationTypes.toArray();

    const issues: string[] = [];

    // Analyze templates
    const builtinTemplates = templates.filter(t => t.isBuiltIn === true || t.isBuiltIn === 1);
    const customTemplates = templates.filter(t => !t.isBuiltIn || (t.isBuiltIn !== true && t.isBuiltIn !== 1));

    const templateDuplicates = new Map<string, CodexTemplate[]>();
    for (const template of templates) {
        const key = `${template.name}|${template.category}`;
        if (!templateDuplicates.has(key)) {
            templateDuplicates.set(key, []);
        }
        templateDuplicates.get(key)!.push(template);
    }

    const duplicateTemplateDetails = Array.from(templateDuplicates.entries())
        .filter(([_, arr]) => arr.length > 1)
        .map(([key, arr]) => {
            const [name, category] = key.split('|');
            return { name, category, count: arr.length };
        });

    // Analyze relation types
    const builtinRelationTypes = relationTypes.filter(t => t.isBuiltIn === true || t.isBuiltIn === 1);
    const customRelationTypes = relationTypes.filter(t => !t.isBuiltIn || (t.isBuiltIn !== true && t.isBuiltIn !== 1));

    const relationTypeDuplicates = new Map<string, CodexRelationType[]>();
    for (const type of relationTypes) {
        const key = `${type.name}|${type.category}`;
        if (!relationTypeDuplicates.has(key)) {
            relationTypeDuplicates.set(key, []);
        }
        relationTypeDuplicates.get(key)!.push(type);
    }

    const duplicateRelationTypeDetails = Array.from(relationTypeDuplicates.entries())
        .filter(([_, arr]) => arr.length > 1)
        .map(([key, arr]) => {
            const [name, category] = key.split('|');
            return { name, category, count: arr.length };
        });

    // Check for issues
    if (duplicateTemplateDetails.length > 0) {
        issues.push(`Found ${duplicateTemplateDetails.length} duplicate template groups`);
    }

    if (duplicateRelationTypeDetails.length > 0) {
        issues.push(`Found ${duplicateRelationTypeDetails.length} duplicate relation type groups`);
    }

    // Expected counts
    const expectedBuiltinTemplates = 5; // character, location, item, lore, subplot
    const expectedBuiltinRelationTypes = 10;

    if (builtinTemplates.length !== expectedBuiltinTemplates) {
        issues.push(`Expected ${expectedBuiltinTemplates} built-in templates, found ${builtinTemplates.length}`);
    }

    if (builtinRelationTypes.length !== expectedBuiltinRelationTypes) {
        issues.push(`Expected ${expectedBuiltinRelationTypes} built-in relation types, found ${builtinRelationTypes.length}`);
    }

    // Validate all templates
    const invalidTemplates = templates.filter(t => !validateTemplate(t));
    if (invalidTemplates.length > 0) {
        issues.push(`Found ${invalidTemplates.length} invalid templates`);
    }

    const invalidRelationTypes = relationTypes.filter(t => !validateRelationType(t));
    if (invalidRelationTypes.length > 0) {
        issues.push(`Found ${invalidRelationTypes.length} invalid relation types`);
    }

    return {
        templateStats: {
            total: templates.length,
            builtin: builtinTemplates.length,
            custom: customTemplates.length,
            duplicates: duplicateTemplateDetails.reduce((sum, d) => sum + (d.count - 1), 0),
            duplicateDetails: duplicateTemplateDetails,
        },
        relationTypeStats: {
            total: relationTypes.length,
            builtin: builtinRelationTypes.length,
            custom: customRelationTypes.length,
            duplicates: duplicateRelationTypeDetails.reduce((sum, d) => sum + (d.count - 1), 0),
            duplicateDetails: duplicateRelationTypeDetails,
        },
        healthyState: issues.length === 0,
        issues,
    };
}

/**
 * Run all cleanup operations and return a summary
 * 
 * @returns Cleanup summary
 */
export async function runFullCleanup(): Promise<{
    templatesRemoved: number;
    relationTypesRemoved: number;
    healthReport: CodexHealthReport;
}> {
    const templatesRemoved = await cleanupDuplicateTemplates();
    const relationTypesRemoved = await cleanupDuplicateRelationTypes();
    const healthReport = await getDatabaseHealthReport();

    return {
        templatesRemoved,
        relationTypesRemoved,
        healthReport,
    };
}
