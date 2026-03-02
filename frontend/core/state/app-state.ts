import type { AIConnection, AIProvider } from "@/lib/config/ai-vendors";
import type { ModelDiscoveryResult } from "@/domain/services/IModelDiscoveryService";
import {
  appPrefDelete,
  appPrefGet,
  appPrefGetMany,
  appPrefSet,
  clearModelDiscoveryCacheCommand,
  deleteAIConnectionCommand,
  getModelDiscoveryCacheCommand,
  listAIConnectionsCommand,
  saveAIConnectionCommand,
  setModelDiscoveryCacheCommand,
  type PersistedAIConnectionDto,
  type SaveAIConnectionInputDto,
} from "@/core/tauri/command-modules";

export const APP_PREFERENCE_UPDATED_EVENT = "app-preference-updated";
export const AI_CONNECTIONS_UPDATED_EVENT = "ai-connections-updated";

export const APP_PREF_KEYS = {
  PROJECT_STORE: "ui.project_store",
  FORMAT_SETTINGS: "ui.format_settings",
  LAST_USED_MODEL: "ai.last_used_model",
  SPARK_LAST_MODEL: "ai.spark_last_model",
  BACKUP_LAST_STATUS: "backup.last_status",
  THEME: "ui.theme",
  SIDEBAR_OPEN: "ui.sidebar_open",
} as const;

export type ThemeMode = "light" | "dark" | "system";

export interface PersistedAIConnection extends Omit<AIConnection, "apiKey"> {
  hasStoredApiKey: boolean;
}

export interface SaveAIConnectionInput extends Omit<
  PersistedAIConnection,
  "hasStoredApiKey" | "createdAt" | "updatedAt"
> {
  apiKey?: string | null;
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeStringify(value: unknown): string {
  return JSON.stringify(value);
}

function notifyPreferenceUpdated(key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(APP_PREFERENCE_UPDATED_EVENT, {
      detail: { key },
    }),
  );
}

export function notifyAIConnectionsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AI_CONNECTIONS_UPDATED_EVENT));
}

export async function getAppPreference<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const raw = await appPrefGet(key);
  return safeParseJson(raw, fallback);
}

export async function getAppPreferences<T extends Record<string, unknown>>(
  keyFallbacks: T,
): Promise<T> {
  const keys = Object.keys(keyFallbacks);
  const map = await appPrefGetMany(keys);
  const result: Record<string, unknown> = {};
  keys.forEach((key) => {
    const fallback = keyFallbacks[key] as unknown;
    result[key] = safeParseJson(map[key] ?? null, fallback);
  });
  return result as T;
}

export async function setAppPreference<T>(
  key: string,
  value: T,
): Promise<void> {
  await appPrefSet(key, safeStringify(value));
  notifyPreferenceUpdated(key);
}

export async function deleteAppPreference(key: string): Promise<void> {
  await appPrefDelete(key);
  notifyPreferenceUpdated(key);
}

function normalizePersistedAIConnection(
  dto: PersistedAIConnectionDto,
): PersistedAIConnection {
  return {
    id: dto.id,
    name: dto.name,
    provider: dto.provider as AIProvider,
    enabled: dto.enabled,
    models: dto.models ?? [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    hasStoredApiKey: dto.hasStoredApiKey,
    ...(dto.customEndpoint ? { customEndpoint: dto.customEndpoint } : {}),
  };
}

function toSaveInputDto(
  input: SaveAIConnectionInput,
): SaveAIConnectionInputDto {
  const dto: SaveAIConnectionInputDto = {
    id: input.id,
    name: input.name,
    provider: input.provider,
    enabled: input.enabled,
    ...(input.customEndpoint ? { customEndpoint: input.customEndpoint } : {}),
    ...(input.models ? { models: input.models } : {}),
    ...(input.apiKey !== undefined ? { apiKey: input.apiKey } : {}),
  };
  return dto;
}

export function toAIConnection(
  connection: PersistedAIConnection,
): AIConnection {
  const aiConnection: AIConnection = {
    id: connection.id,
    name: connection.name,
    provider: connection.provider,
    enabled: connection.enabled,
    models: connection.models ?? [],
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    apiKey: "",
  };
  if (connection.customEndpoint) {
    aiConnection.customEndpoint = connection.customEndpoint;
  }
  return aiConnection;
}

export async function listAIConnections(): Promise<PersistedAIConnection[]> {
  const rows = await listAIConnectionsCommand();
  return rows.map(normalizePersistedAIConnection);
}

export async function saveAIConnection(
  input: SaveAIConnectionInput,
): Promise<PersistedAIConnection> {
  const saved = await saveAIConnectionCommand(toSaveInputDto(input));
  notifyAIConnectionsUpdated();
  return normalizePersistedAIConnection(saved);
}

export async function deleteAIConnection(id: string): Promise<void> {
  await deleteAIConnectionCommand(id);
  notifyAIConnectionsUpdated();
}

export async function getModelDiscoveryCache(
  provider: string,
  endpoint: string,
): Promise<ModelDiscoveryResult | null> {
  const entry = await getModelDiscoveryCacheCommand(provider, endpoint);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    return null;
  }

  const parsed = safeParseJson<ModelDiscoveryResult | null>(
    entry.payloadJson,
    null,
  );
  if (!parsed) {
    return null;
  }

  return {
    ...parsed,
    cachedAt: entry.cachedAt,
  };
}

export async function setModelDiscoveryCache(
  provider: string,
  endpoint: string,
  payload: ModelDiscoveryResult,
  ttlMs: number,
): Promise<void> {
  await setModelDiscoveryCacheCommand(
    provider,
    endpoint,
    safeStringify(payload),
    ttlMs,
  );
}

export async function clearModelDiscoveryCache(
  provider?: string,
): Promise<void> {
  await clearModelDiscoveryCacheCommand(provider);
}
