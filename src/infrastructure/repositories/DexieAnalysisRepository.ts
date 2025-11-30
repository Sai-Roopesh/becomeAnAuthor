import { db } from '@/lib/core/database';
import type { StoryAnalysis } from '@/lib/config/types';
import type { IAnalysisRepository } from '@/domain/repositories/IAnalysisRepository';

/**
 * Dexie implementation of IAnalysisRepository
 * Wraps all Dexie database calls for story analyses
 */
export class DexieAnalysisRepository implements IAnalysisRepository {
    async get(id: string): Promise<StoryAnalysis | undefined> {
        return await db.storyAnalyses.get(id);
    }

    async getByProject(projectId: string): Promise<StoryAnalysis[]> {
        return await db.storyAnalyses
            .where('projectId')
            .equals(projectId)
            .reverse()
            .sortBy('createdAt');
    }

    async getByType(projectId: string, type: string): Promise<StoryAnalysis[]> {
        return await db.storyAnalyses
            .where(['projectId', 'analysisType'])
            .equals([projectId, type])
            .reverse()
            .sortBy('createdAt');
    }

    async getLatest(projectId: string): Promise<StoryAnalysis | undefined> {
        const analyses = await this.getByProject(projectId);
        return analyses[0]; // Already sorted by createdAt desc
    }

    async create(analysis: Omit<StoryAnalysis, 'id' | 'createdAt'>): Promise<StoryAnalysis> {
        const newAnalysis: StoryAnalysis = {
            ...analysis,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            results: {
                ...analysis.results,
                insights: analysis.results.insights.map(insight => ({
                    ...insight,
                    id: crypto.randomUUID(),
                    dismissed: false,
                    resolved: false,
                })),
            },
        };

        await db.storyAnalyses.add(newAnalysis);
        return newAnalysis;
    }

    async update(id: string, data: Partial<StoryAnalysis>): Promise<void> {
        await db.storyAnalyses.update(id, data);
    }

    async updateInsight(
        analysisId: string,
        insightId: string,
        updates: { dismissed?: boolean; resolved?: boolean }
    ): Promise<void> {
        const analysis = await this.get(analysisId);
        if (!analysis) return;

        const updatedInsights = analysis.results.insights.map(insight =>
            insight.id === insightId ? { ...insight, ...updates } : insight
        );

        await this.update(analysisId, {
            results: { ...analysis.results, insights: updatedInsights },
        });
    }

    async delete(id: string): Promise<void> {
        await db.storyAnalyses.delete(id);
    }

    async deleteByProject(projectId: string): Promise<void> {
        // ✅ TRANSACTION: Bulk delete is atomic
        await db.transaction('rw', db.storyAnalyses, async () => {
            const analyses = await this.getByProject(projectId);
            if (analyses.length > 0) {
                await db.storyAnalyses.bulkDelete(analyses.map(a => a.id));
            }
        });
    }
}
