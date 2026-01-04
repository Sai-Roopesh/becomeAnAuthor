import type { CodexTemplate, CodexCategory } from '@/domain/entities/types';

/**
 * Repository interface for Codex Template operations
 * 
 * ✅ ARCHITECTURE: Domain layer interface - implementation agnostic
 */
export interface ICodexTemplateRepository {
    /**
     * Get a template by ID
     * @param id - Template ID
     * @returns The template or undefined if not found
     */
    get(id: string): Promise<CodexTemplate | undefined>;

    /**
     * Get templates by codex category
     * @param category - Codex category (e.g., 'character', 'location', 'item')
     * @returns Templates for the specified category
     */
    getByCategory(category: CodexCategory): Promise<CodexTemplate[]>;

    /**
     * Get built-in (system-provided) templates
     * @returns Built-in templates only
     */
    getBuiltInTemplates(): Promise<CodexTemplate[]>;

    /**
     * Get custom templates for a specific project
     * @param projectId - Project ID to get custom templates for
     * @returns Custom templates created for the project
     */
    getCustomTemplates(projectId: string): Promise<CodexTemplate[]>;

    /**
     * Create a new custom template
     * @param template - Template data (without id and createdAt)
     * @returns The created template with generated ID and timestamp
     */
    create(template: Omit<CodexTemplate, 'id' | 'createdAt'>): Promise<CodexTemplate>;

    /**
     * Update an existing template
     * @param id - Template ID to update
     * @param data - Partial data to update
     */
    update(id: string, data: Partial<CodexTemplate>): Promise<void>;

    /**
     * Delete a template
     * @param id - Template ID to delete
     */
    delete(id: string): Promise<void>;
}
