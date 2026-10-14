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

export interface IAIConnectionRepository {
  list(): Promise<PersistedAIConnectionDto[]>;
  save(connection: SaveAIConnectionInputDto): Promise<PersistedAIConnectionDto>;
  delete(connectionId: string): Promise<void>;
  getLastUsedModel(): Promise<string | null>;
  setLastUsedModel(modelId: string): Promise<void>;
}
