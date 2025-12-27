import type { StoryAnalysis } from '@/domain/entities/types';

/**
 * Repository interface for story analyses
 * Decouples business logic from Dexie implementation
 */
export interface IAnalysisRepository {
    /**
     * Get a single analysis by ID
     */
    get(id: string): Promise<StoryAnalysis | undefined>;

    /**
     * Get all analyses for a project
     */
    getByProject(projectId: string): Promise<StoryAnalysis[]>;

    /**
     * Get analyses by type
     */
    getByType(projectId: string, type: string): Promise<StoryAnalysis[]>;

    /**
     * Get latest analysis for version comparison
     */
    getLatest(projectId: string): Promise<StoryAnalysis | undefined>;

    /**
     * Create a new analysis
     */
    create(analysis: Omit<StoryAnalysis, 'id' | 'createdAt'>): Promise<StoryAnalysis>;

    /**
     * Update an existing analysis
     */
    update(id: string, data: Partial<StoryAnalysis>): Promise<void>;

    /**
     * Mark insight as dismissed/resolved
     */
    updateInsight(analysisId: string, insightId: string, updates: { dismissed?: boolean; resolved?: boolean }): Promise<void>;

    /**
     * Delete an analysis
     */
    delete(id: string): Promise<void>;

    /**
     * Delete all analyses for a project
     */
    deleteByProject(projectId: string): Promise<void>;
}
