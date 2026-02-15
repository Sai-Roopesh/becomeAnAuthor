import { StoryAnalysis } from "../entities/types";

export interface IAnalysisRepository {
  create(analysis: Omit<StoryAnalysis, "id" | "createdAt">): Promise<StoryAnalysis>;
  get(id: string): Promise<StoryAnalysis | null>;
  getByProject(projectId: string): Promise<StoryAnalysis[]>;
  getByType(projectId: string, type: string): Promise<StoryAnalysis[]>;
  getLatest(projectId: string, type?: string): Promise<StoryAnalysis | null>;
  delete(id: string): Promise<void>;
  update(id: string, updates: Partial<StoryAnalysis>): Promise<StoryAnalysis>;
}
