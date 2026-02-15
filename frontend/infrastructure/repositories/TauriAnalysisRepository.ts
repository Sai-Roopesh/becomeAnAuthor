import { IAnalysisRepository } from "@/domain/repositories/IAnalysisRepository";
import { StoryAnalysis } from "@/domain/entities/types";
import { readTextFile, writeTextFile, remove, exists, mkdir, readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { logger } from "@/shared/utils/logger";
import { v4 as uuidv4 } from 'uuid';

const log = logger.scope("TauriAnalysisRepository");

export class TauriAnalysisRepository implements IAnalysisRepository {
  private projectPath: string | null = null;
  // Singleton instance
  private static instance: TauriAnalysisRepository | null = null;

  static getInstance(): TauriAnalysisRepository {
    if (!TauriAnalysisRepository.instance) {
      TauriAnalysisRepository.instance = new TauriAnalysisRepository();
    }
    return TauriAnalysisRepository.instance;
  }

  setProjectPath(path: string | null): void {
    this.projectPath = path;
  }

  private async getAnalysisDir(): Promise<string> {
    if (!this.projectPath) {
      throw new Error("Project path not set");
    }
    // We assume projectPath is absolute.
    // We store analyses in <projectPath>/analyses/
    return await join(this.projectPath, "analyses");
  }

  async create(analysis: Omit<StoryAnalysis, "id" | "createdAt">): Promise<StoryAnalysis> {
    const id = uuidv4();
    const createdAt = Date.now();
    const newAnalysis: StoryAnalysis = {
      ...analysis,
      id,
      createdAt,
    };

    const dir = await this.getAnalysisDir();
    if (!(await exists(dir))) {
      await mkdir(dir);
    }

    const filePath = await join(dir, `${id}.json`);
    await writeTextFile(filePath, JSON.stringify(newAnalysis, null, 2));

    return newAnalysis;
  }

  async get(id: string): Promise<StoryAnalysis | null> {
    try {
      const dir = await this.getAnalysisDir();
      const filePath = await join(dir, `${id}.json`);
      if (!(await exists(filePath))) {
        return null;
      }
      const content = await readTextFile(filePath);
      return JSON.parse(content) as StoryAnalysis;
    } catch (error) {
      log.error(`Failed to get analysis ${id}`, error);
      return null;
    }
  }

  async getByProject(projectId: string): Promise<StoryAnalysis[]> {
      try {
        const dir = await this.getAnalysisDir();
        if (!(await exists(dir))) {
          return [];
        }

        const entries = await readDir(dir);
        const analyses: StoryAnalysis[] = [];

        for (const entry of entries) {
            if (entry.isFile && entry.name.endsWith(".json")) {
                try {
                    const filePath = await join(dir, entry.name);
                    const content = await readTextFile(filePath);
                    const analysis = JSON.parse(content) as StoryAnalysis;
                    if (analysis.projectId === projectId) {
                        analyses.push(analysis);
                    }
                } catch (e) {
                    log.warn(`Failed to parse analysis file ${entry.name}`, { error: e });
                }
            }
        }

        // Sort by createdAt desc
        return analyses.sort((a, b) => b.createdAt - a.createdAt);
      } catch (error) {
          log.error("Failed to list analyses", error);
          return [];
      }
  }

  async getByType(projectId: string, type: string): Promise<StoryAnalysis[]> {
    const all = await this.getByProject(projectId);
    return all.filter(a => a.analysisType === type);
  }

  async getLatest(projectId: string, type?: string): Promise<StoryAnalysis | null> {
    if (type) {
      const all = await this.getByType(projectId, type);
      return all[0] || null;
    }
    const all = await this.getByProject(projectId);
    return all[0] || null;
  }

  async delete(id: string): Promise<void> {
    try {
      const dir = await this.getAnalysisDir();
      const filePath = await join(dir, `${id}.json`);
      if (await exists(filePath)) {
        await remove(filePath);
      }
    } catch (error) {
      log.error(`Failed to delete analysis ${id}`, error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<StoryAnalysis>): Promise<StoryAnalysis> {
    const current = await this.get(id);
    if (!current) {
      throw new Error(`Analysis ${id} not found`);
    }

    const updated = { ...current, ...updates };
    const dir = await this.getAnalysisDir();
    const filePath = await join(dir, `${id}.json`);

    await writeTextFile(filePath, JSON.stringify(updated, null, 2));

    return updated;
  }
}
