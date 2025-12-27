import type { StoryAnalysis } from '@/domain/entities/types';

/**
 * Service interface for running story analyses
 */
export interface IAnalysisService {
    /**
     * Run analysis on manuscript
     */
    runAnalysis(
        projectId: string,
        scope: string[],
        types: string[],
        model: string
    ): Promise<StoryAnalysis[]>;

    /**
     * Get manuscript version (sum of updatedAt timestamps)
     */
    getManuscriptVersion(projectId: string): Promise<number>;

    /**
     * Count scenes edited since analysis
     */
    countEditedScenes(analysis: StoryAnalysis): Promise<number>;

    /**
     * Estimate token usage for analysis
     */
    estimateTokens(scope: string[], types: string[]): Promise<number>;
}
