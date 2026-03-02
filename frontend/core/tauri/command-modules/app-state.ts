import { invoke } from "@tauri-apps/api/core";

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

export interface ModelDiscoveryCacheEntryDto {
  provider: string;
  endpoint: string;
  payloadJson: string;
  cachedAt: number;
  expiresAt: number;
}

export async function appPrefGet(key: string): Promise<string | null> {
  return invoke<string | null>("app_pref_get", { key });
}

export async function appPrefGetMany(
  keys: string[],
): Promise<Record<string, string>> {
  return invoke<Record<string, string>>("app_pref_get_many", { keys });
}

export async function appPrefSet(
  key: string,
  valueJson: string,
): Promise<void> {
  await invoke("app_pref_set", { key, valueJson });
}

export async function appPrefDelete(key: string): Promise<void> {
  await invoke("app_pref_delete", { key });
}

export async function listAIConnectionsCommand(): Promise<
  PersistedAIConnectionDto[]
> {
  return invoke<PersistedAIConnectionDto[]>("list_ai_connections");
}

export async function saveAIConnectionCommand(
  input: SaveAIConnectionInputDto,
): Promise<PersistedAIConnectionDto> {
  return invoke<PersistedAIConnectionDto>("save_ai_connection", { input });
}

export async function deleteAIConnectionCommand(id: string): Promise<void> {
  await invoke("delete_ai_connection", { id });
}

export async function getModelDiscoveryCacheCommand(
  provider: string,
  endpoint: string,
): Promise<ModelDiscoveryCacheEntryDto | null> {
  return invoke<ModelDiscoveryCacheEntryDto | null>(
    "get_model_discovery_cache",
    {
      provider,
      endpoint,
    },
  );
}

export async function setModelDiscoveryCacheCommand(
  provider: string,
  endpoint: string,
  payloadJson: string,
  ttlMs: number,
): Promise<void> {
  await invoke("set_model_discovery_cache", {
    provider,
    endpoint,
    payloadJson,
    ttlMs,
  });
}

export async function clearModelDiscoveryCacheCommand(
  provider?: string,
): Promise<void> {
  await invoke("clear_model_discovery_cache", {
    provider,
  });
}
