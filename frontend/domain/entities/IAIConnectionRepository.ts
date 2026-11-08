export interface PersistedAIConnectionDto {
  id: string;
  provider: string;
  label: string;
  has_secret: boolean;
  url?: string;
}

export interface SaveAIConnectionInputDto {
  id?: string;
  provider: string;
  label: string;
  secret?: string;
  url?: string;
}

export interface IAIConnectionRepository {
  list(): Promise<PersistedAIConnectionDto[]>;
  save(connection: SaveAIConnectionInputDto): Promise<PersistedAIConnectionDto>;
  delete(connectionId: string): Promise<void>;
  getLastUsedModel(): Promise<string | null>;
  setLastUsedModel(modelId: string): Promise<void>;
}
