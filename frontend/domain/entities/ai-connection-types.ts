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
