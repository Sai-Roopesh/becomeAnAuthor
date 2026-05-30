/**
 * Tauri Search Repository
 * Implements ISearchRepository using the search_project Tauri command.
 * Search is a read-only operation — no cache invalidation needed.
 */

import type { ISearchRepository } from "@/domain/entities/ISearchRepository";
import type { SearchResult } from "@/core/tauri/command-modules/types";
import { searchProject } from "@/core/tauri";
import { logger } from "@/shared/utils/logger";
import { toAppError } from "@/shared/errors/app-error";
import { TauriNotAvailableError } from "@/core/tauri/invoke";

const log = logger.scope("TauriSearchRepository");

/**
 * Tauri-based Search Repository
 * Delegates full-text search to the Rust backend via the search_project command.
 */
export class TauriSearchRepository implements ISearchRepository {
  async search(
    projectPath: string,
    query: string,
    options?: { scope?: "all" | "scenes" | "codex" },
  ): Promise<SearchResult[]> {
    try {
      return await searchProject(projectPath, query, options?.scope);
    } catch (error) {
      if (!(error instanceof TauriNotAvailableError)) {
        log.error("Failed to search project:", error);
      }
      throw toAppError(error, "E_SEARCH_FAILED", "Failed to search project");
    }
  }
}
