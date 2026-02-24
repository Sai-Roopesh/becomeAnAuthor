import { invoke } from "@tauri-apps/api/core";
import type {
  CodexEntry,
  CodexRelation,
  Series,
} from "@/domain/entities/types";
import type { DeletedSeriesMeta } from "./types";

export async function listSeries(): Promise<Series[]> {
  return invoke<Series[]>("list_series");
}

export async function createSeries(
  series: Omit<Series, "id" | "createdAt" | "updatedAt">,
): Promise<Series> {
  return invoke<Series>("create_series", {
    title: series.title,
    description: series.description,
    author: series.author,
    genre: series.genre,
    status: series.status,
  });
}

export async function updateSeries(
  seriesId: string,
  updates: Partial<Series>,
): Promise<void> {
  return invoke("update_series", { seriesId, updates });
}

export async function deleteSeries(seriesId: string): Promise<void> {
  return invoke("delete_series", { seriesId });
}

export async function deleteSeriesCascade(seriesId: string): Promise<number> {
  return invoke<number>("delete_series_cascade", { seriesId });
}

export async function listDeletedSeries(): Promise<DeletedSeriesMeta[]> {
  return invoke<DeletedSeriesMeta[]>("list_deleted_series");
}

export async function restoreDeletedSeries(
  oldSeriesId: string,
): Promise<Series> {
  return invoke<Series>("restore_deleted_series", { oldSeriesId });
}

export async function permanentlyDeleteDeletedSeries(
  oldSeriesId: string,
): Promise<void> {
  return invoke("permanently_delete_deleted_series", { oldSeriesId });
}

export async function listSeriesCodexEntries(
  seriesId: string,
  category?: string,
): Promise<CodexEntry[]> {
  return invoke<CodexEntry[]>("list_series_codex_entries", {
    seriesId,
    category,
  });
}

export async function getSeriesCodexEntry(
  seriesId: string,
  entryId: string,
): Promise<CodexEntry | null> {
  return invoke<CodexEntry | null>("get_series_codex_entry", {
    seriesId,
    entryId,
  });
}

export async function saveSeriesCodexEntry(
  seriesId: string,
  entry: CodexEntry,
): Promise<void> {
  return invoke("save_series_codex_entry", { seriesId, entry });
}

export async function deleteSeriesCodexEntry(
  seriesId: string,
  entryId: string,
  category: string,
): Promise<void> {
  return invoke("delete_series_codex_entry", { seriesId, entryId, category });
}

export async function listSeriesCodexRelations(
  seriesId: string,
): Promise<CodexRelation[]> {
  return invoke<CodexRelation[]>("list_series_codex_relations", { seriesId });
}

export async function saveSeriesCodexRelation(
  seriesId: string,
  relation: CodexRelation,
): Promise<void> {
  return invoke("save_series_codex_relation", { seriesId, relation });
}

export async function deleteSeriesCodexRelation(
  seriesId: string,
  relationId: string,
): Promise<void> {
  return invoke("delete_series_codex_relation", { seriesId, relationId });
}
