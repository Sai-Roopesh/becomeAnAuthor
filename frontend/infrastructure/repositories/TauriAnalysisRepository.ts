/**
 * Tauri Analysis Repository
 * Implements IAnalysisRepository using file system through Tauri commands
 */

import type { IAnalysisRepository } from '@/domain/repositories/IAnalysisRepository';
import type { StoryAnalysis, AnalysisInsight } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from './TauriNodeRepository';

export class TauriAnalysisRepository implements IAnalysisRepository {
    private async getAllAnalyses(): Promise<StoryAnalysis[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await invoke<StoryAnalysis[]>('list_analyses', { projectPath });
        } catch {
            return [];
        }
    }

    async get(id: string): Promise<StoryAnalysis | undefined> {
        const analyses = await this.getAllAnalyses();
        return analyses.find(a => a.id === id);
    }

    async getByProject(projectId: string): Promise<StoryAnalysis[]> {
        return await this.getAllAnalyses();
    }

    async getByType(projectId: string, type: string): Promise<StoryAnalysis[]> {
        const analyses = await this.getAllAnalyses();
        return analyses.filter(a => a.analysisType === type);
    }

    async getLatest(projectId: string): Promise<StoryAnalysis | undefined> {
        const analyses = await this.getAllAnalyses();
        if (analyses.length === 0) return undefined;
        return analyses.sort((a, b) => b.createdAt - a.createdAt)[0];
    }

    async create(analysis: Omit<StoryAnalysis, 'id' | 'createdAt'>): Promise<StoryAnalysis> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) throw new Error('No project path set');

        const newAnalysis: StoryAnalysis = {
            ...analysis,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };

        await invoke('save_analysis', { projectPath, analysis: newAnalysis });
        return newAnalysis;
    }

    async update(id: string, data: Partial<StoryAnalysis>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const existing = await this.get(id);
        if (!existing) return;

        const updated = { ...existing, ...data };
        await invoke('save_analysis', { projectPath, analysis: updated });
    }

    async updateInsight(analysisId: string, insightId: string, updates: { dismissed?: boolean; resolved?: boolean }): Promise<void> {
        const analysis = await this.get(analysisId);
        if (!analysis) return;

        const updatedInsights = analysis.results.insights.map((insight: AnalysisInsight) => {
            if (insight.id === insightId) {
                return { ...insight, ...updates };
            }
            return insight;
        });

        await this.update(analysisId, {
            results: {
                ...analysis.results,
                insights: updatedInsights,
            },
        });
    }

    async delete(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_analysis', { projectPath, analysisId: id });
    }

    async deleteByProject(projectId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        const analyses = await this.getAllAnalyses();
        for (const analysis of analyses) {
            await invoke('delete_analysis', { projectPath, analysisId: analysis.id });
        }
    }
}
