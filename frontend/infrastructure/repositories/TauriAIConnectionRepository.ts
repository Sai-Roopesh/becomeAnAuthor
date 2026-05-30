/**
 * Tauri AI Connection Repository
 * Implements IAIConnectionRepository by delegating to the Tauri AI connection
 * commands.  Mirrors the logic previously spread across core/state/app-state.ts
 * (listAIConnections, saveAIConnection, deleteAIConnection) and centralises it
 * behind the repository interface.
 */

import type { IAIConnectionRepository } from "@/domain/entities/IAIConnectionRepository";
import {
  listAIConnectionsCommand,
  saveAIConnectionCommand,
  deleteAIConnectionCommand,
  type PersistedAIConnectionDto,
  type SaveAIConnectionInputDto,
} from "@/core/tauri/command-modules/app-state";
import { appPrefGet, appPrefSet } from "@/core/tauri/command-modules/app-state";
import { invalidateQueries } from "@/hooks/use-live-query";
import { logger } from "@/shared/utils/logger";
import { toAppError } from "@/shared/errors/app-error";
import { TauriNotAvailableError } from "@/core/tauri/invoke";

const log = logger.scope("TauriAIConnectionRepository");

/** app-pref key that stores the last-used model ID */
const LAST_USED_MODEL_KEY = "ai.last_used_model";

/**
 * Tauri-based AI Connection Repository
 * Persists AI provider connections via the backend keychain / SQLite layer.
 */
export class TauriAIConnectionRepository implements IAIConnectionRepository {
  async list(): Promise<PersistedAIConnectionDto[]> {
    try {
      return await listAIConnectionsCommand();
    } catch (error) {
      if (!(error instanceof TauriNotAvailableError)) {
        log.error("Failed to list AI connections:", error);
      }
      throw toAppError(
        error,
        "E_AI_CONNECTION_LIST_FAILED",
        "Failed to load AI connections",
      );
    }
  }

  async save(
    connection: SaveAIConnectionInputDto,
  ): Promise<PersistedAIConnectionDto> {
    try {
      const saved = await saveAIConnectionCommand(connection);
      invalidateQueries(["ai-connections"]);
      return saved;
    } catch (error) {
      if (!(error instanceof TauriNotAvailableError)) {
        log.error("Failed to save AI connection:", error);
      }
      throw toAppError(
        error,
        "E_AI_CONNECTION_SAVE_FAILED",
        "Failed to save AI connection",
      );
    }
  }

  async delete(connectionId: string): Promise<void> {
    try {
      await deleteAIConnectionCommand(connectionId);
      invalidateQueries(["ai-connections"]);
    } catch (error) {
      if (!(error instanceof TauriNotAvailableError)) {
        log.error("Failed to delete AI connection:", error);
      }
      throw toAppError(
        error,
        "E_AI_CONNECTION_DELETE_FAILED",
        "Failed to delete AI connection",
      );
    }
  }

  async getLastUsedModel(): Promise<string | null> {
    try {
      const raw = await appPrefGet(LAST_USED_MODEL_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as string;
      } catch {
        return raw;
      }
    } catch (error) {
      if (!(error instanceof TauriNotAvailableError)) {
        log.error("Failed to get last used model:", error);
      }
      return null;
    }
  }

  async setLastUsedModel(modelId: string): Promise<void> {
    try {
      await appPrefSet(LAST_USED_MODEL_KEY, JSON.stringify(modelId));
    } catch (error) {
      if (!(error instanceof TauriNotAvailableError)) {
        log.error("Failed to set last used model:", error);
      }
      throw toAppError(
        error,
        "E_AI_LAST_MODEL_SAVE_FAILED",
        "Failed to save last used model",
      );
    }
  }
}
