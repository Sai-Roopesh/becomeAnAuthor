import type { CodexTemplate, CodexCategory } from '@/domain/entities/types';

/**
 * Repository interface for Codex Template operations
 * 
 * ✅ ARCHITECTURE: Domain layer interface - implementation agnostic
 */
export interface ICodexTemplateRepository {
    get(id: string): Promise<CodexTemplate | undefined>;
    getByCategory(category: CodexCategory): Promise<CodexTemplate[]>;
    getBuiltInTemplates(): Promise<CodexTemplate[]>;
    getCustomTemplates(projectId: string): Promise<CodexTemplate[]>;
    create(template: Omit<CodexTemplate, 'id' | 'createdAt'>): Promise<CodexTemplate>;
    update(id: string, data: Partial<CodexTemplate>): Promise<void>;
    delete(id: string): Promise<void>;
}
