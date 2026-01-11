/**
 * Tauri Analysis Repository
 * Implements IAnalysisRepository using file system through Tauri commands
 */

import type { IAnalysisRepository } from "@/domain/repositories/IAnalysisRepository";
import type { StoryAnalysis, AnalysisInsight } from "@/domain/entities/types";
import { listAnalyses, saveAnalysis, deleteAnalysis } from "@/core/tauri";
import { TauriNodeRepository } from "./TauriNodeRepository";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriAnalysisRepository");

export class TauriAnalysisRepository implements IAnalysisRepository {
  private async getAllAnalyses(): Promise<StoryAnalysis[]> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return [];

    try {
      return await listAnalyses(projectPath);
    } catch (error) {
      log.error("Failed to list analyses:", error);
      return [];
    }
  }

  async get(id: string): Promise<StoryAnalysis | undefined> {
    const analyses = await this.getAllAnalyses();
    return analyses.find((a) => a.id === id);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getByProject(_projectId: string): Promise<StoryAnalysis[]> {
    return await this.getAllAnalyses();
  }

  async getByType(_projectId: string, type: string): Promise<StoryAnalysis[]> {
    const analyses = await this.getAllAnalyses();
    return analyses.filter((a) => a.analysisType === type);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLatest(_projectId: string): Promise<StoryAnalysis | undefined> {
    const analyses = await this.getAllAnalyses();
    if (analyses.length === 0) return undefined;
    return analyses.sort((a, b) => b.createdAt - a.createdAt)[0];
  }

  async create(
    analysis: Omit<StoryAnalysis, "id" | "createdAt">,
  ): Promise<StoryAnalysis> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) throw new Error("No project path set");

    const newAnalysis: StoryAnalysis = {
      ...analysis,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    try {
      await saveAnalysis(projectPath, newAnalysis);
      return newAnalysis;
    } catch (error) {
      log.error("Failed to create analysis:", error);
      throw error;
    }
  }

  async update(id: string, data: Partial<StoryAnalysis>): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return;

    const existing = await this.get(id);
    if (!existing) return;

    const updated = { ...existing, ...data };
    try {
      await saveAnalysis(projectPath, updated);
    } catch (error) {
      log.error("Failed to update analysis:", error);
      throw error;
    }
  }

  async updateInsight(
    analysisId: string,
    insightId: string,
    updates: { dismissed?: boolean; resolved?: boolean },
  ): Promise<void> {
    const analysis = await this.get(analysisId);
    if (!analysis) return;

    const updatedInsights = analysis.results.insights.map(
      (insight: AnalysisInsight) => {
        if (insight.id === insightId) {
          return { ...insight, ...updates };
        }
        return insight;
      },
    );

    await this.update(analysisId, {
      results: {
        ...analysis.results,
        insights: updatedInsights,
      },
    });
  }

  async delete(id: string): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return;

    try {
      await deleteAnalysis(projectPath, id);
    } catch (error) {
      log.error("Failed to delete analysis:", error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteByProject(_projectId: string): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return;

    try {
      const analyses = await this.getAllAnalyses();
      for (const analysis of analyses) {
        await deleteAnalysis(projectPath, analysis.id);
      }
    } catch (error) {
      log.error("Failed to delete analyses by project:", error);
      throw error;
    }
  }
}
