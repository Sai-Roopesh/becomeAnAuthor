import type {
  PersistedAIConnectionDto,
  SaveAIConnectionInputDto,
} from "./AIConnectionDto";

export interface IAIConnectionRepository {
  list(): Promise<PersistedAIConnectionDto[]>;
  save(connection: SaveAIConnectionInputDto): Promise<PersistedAIConnectionDto>;
  delete(connectionId: string): Promise<void>;
  getLastUsedModel(): Promise<string | null>;
  setLastUsedModel(modelId: string): Promise<void>;
}
