import {
  listSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  deleteSeriesCascade,
} from "@/core/tauri";
import type { ISeriesRepository } from "@/domain/repositories/ISeriesRepository";
import type { Series } from "@/domain/entities/types";
import { logger } from "@/shared/utils/logger";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("TauriSeriesRepository");

/**
 * Tauri SQLite-backed implementation of Series Repository
 * Persists series metadata in backend SQLite tables.
 */
export class TauriSeriesRepository implements ISeriesRepository {
  async getAll(): Promise<Series[]> {
    try {
      return await listSeries();
    } catch (error) {
      log.error("Failed to list series:", error);
      throw toAppError(error, "E_SERIES_LIST_FAILED", "Failed to load series");
    }
  }

  async get(id: string): Promise<Series | undefined> {
    try {
      const all = await this.getAll();
      return all.find((s: Series) => s.id === id);
    } catch (error) {
      log.error("Failed to get series:", error);
      throw toAppError(error, "E_SERIES_GET_FAILED", "Failed to load series");
    }
  }

  async getByName(name: string): Promise<Series | undefined> {
    const all = await this.getAll();
    return all.find(
      (s: Series) => s.title.toLowerCase() === name.toLowerCase(),
    );
  }

  async create(
    series: Omit<Series, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    try {
      const result = await createSeries(series);
      return result.id;
    } catch (error) {
      log.error("Failed to create series:", error);
      throw toAppError(
        error,
        "E_SERIES_CREATE_FAILED",
        "Failed to create series",
      );
    }
  }

  async update(id: string, updates: Partial<Series>): Promise<void> {
    try {
      return await updateSeries(id, updates);
    } catch (error) {
      log.error("Failed to update series:", error);
      throw toAppError(
        error,
        "E_SERIES_UPDATE_FAILED",
        "Failed to update series",
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await deleteSeries(id);
    } catch (error) {
      log.error("Failed to delete series:", error);
      throw toAppError(
        error,
        "E_SERIES_DELETE_FAILED",
        "Failed to delete series",
      );
    }
  }

  async deleteCascade(id: string): Promise<number> {
    try {
      return await deleteSeriesCascade(id);
    } catch (error) {
      log.error("Failed to cascade delete series:", error);
      throw toAppError(
        error,
        "E_SERIES_DELETE_CASCADE_FAILED",
        "Failed to delete series",
      );
    }
  }
}
