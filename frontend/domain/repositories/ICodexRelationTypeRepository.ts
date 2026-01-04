import type { CodexRelationType } from '@/domain/entities/types';

/**
 * Repository interface for Codex Relation Type operations
 * 
 * ✅ ARCHITECTURE: Domain layer interface - implementation agnostic
 */
export interface ICodexRelationTypeRepository {
    /**
     * Get a relation type by ID
     * @param id - Relation type ID
     * @returns The relation type or undefined if not found
     */
    get(id: string): Promise<CodexRelationType | undefined>;

    /**
     * Get all relation types (built-in and custom)
     * @returns All available relation types
     */
    getAll(): Promise<CodexRelationType[]>;

    /**
     * Get relation types by category
     * @param category - Category to filter by (e.g., 'family', 'social', 'professional')
     * @returns Relation types in the specified category
     */
    getByCategory(category: string): Promise<CodexRelationType[]>;

    /**
     * Get built-in (system-provided) relation types
     * @returns Built-in relation types only
     */
    getBuiltIn(): Promise<CodexRelationType[]>;

    /**
     * Create a new custom relation type
     * @param type - Relation type data (without id)
     * @returns The created relation type with generated ID
     */
    create(type: Omit<CodexRelationType, 'id'>): Promise<CodexRelationType>;

    /**
     * Update an existing relation type
     * @param id - Relation type ID to update
     * @param data - Partial data to update
     */
    update(id: string, data: Partial<CodexRelationType>): Promise<void>;

    /**
     * Delete a relation type
     * @param id - Relation type ID to delete
     */
    delete(id: string): Promise<void>;
}
