export interface PersistedAIConnectionDto {
  id: string;
  provider: string;
  api_key_last_four: string | null;
  base_url: string | null;
  is_enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface SaveAIConnectionInputDto {
  id?: string;
  provider: string;
  api_key: string | null;
  base_url: string | null;
  is_enabled?: boolean;
}

export interface IAIConnectionRepository {
  list(): Promise<PersistedAIConnectionDto[]>;
  save(connection: SaveAIConnectionInputDto): Promise<PersistedAIConnectionDto>;
  delete(connectionId: string): Promise<void>;
  getLastUsedModel(): Promise<string | null>;
  setLastUsedModel(modelId: string): Promise<void>;
}
