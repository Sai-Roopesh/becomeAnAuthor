import type {
  PersistedAIConnectionDto,
  SaveAIConnectionInputDto,
} from "@/core/tauri/command-modules/app-state";

export interface IAIConnectionRepository {
  list(): Promise<PersistedAIConnectionDto[]>;
  save(connection: SaveAIConnectionInputDto): Promise<PersistedAIConnectionDto>;
  delete(connectionId: string): Promise<void>;
  getLastUsedModel(): Promise<string | null>;
  setLastUsedModel(modelId: string): Promise<void>;
}
