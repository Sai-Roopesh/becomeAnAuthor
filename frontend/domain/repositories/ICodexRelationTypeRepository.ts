import type { CodexRelationType } from '@/domain/entities/types';

/**
 * Repository interface for Codex Relation Type operations
 * 
 * ✅ ARCHITECTURE: Domain layer interface - implementation agnostic
 */
export interface ICodexRelationTypeRepository {
    get(id: string): Promise<CodexRelationType | undefined>;
    getAll(): Promise<CodexRelationType[]>;
    getByCategory(category: string): Promise<CodexRelationType[]>;
    getBuiltIn(): Promise<CodexRelationType[]>;
    create(type: Omit<CodexRelationType, 'id'>): Promise<CodexRelationType>;
    update(id: string, data: Partial<CodexRelationType>): Promise<void>;
    delete(id: string): Promise<void>;
}
