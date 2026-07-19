export interface SearchResult {
  id: string;
  title: string;
  type: "scene" | "codex";
  snippet?: string;
  score?: number;
  category?: string;
  path: string;
}

export interface PersistedAIConnectionDto {
  id: string;
  name: string;
  provider: string;
  customEndpoint?: string;
  enabled: boolean;
  models: string[];
  createdAt: number;
  updatedAt: number;
  hasStoredApiKey: boolean;
}

export interface SaveAIConnectionInputDto {
  id: string;
  name: string;
  provider: string;
  customEndpoint?: string;
  enabled: boolean;
  models?: string[];
  apiKey?: string | null;
}
