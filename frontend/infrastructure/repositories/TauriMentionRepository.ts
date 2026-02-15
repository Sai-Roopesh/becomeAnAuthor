import { invoke } from "@tauri-apps/api/core";
import type { IMentionRepository } from "@/domain/repositories/IMentionRepository";
import type { Mention } from "@/domain/entities/types";
import { listProjects } from "@/core/tauri";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriMentionRepository");

/**
 * Tauri implementation of IMentionRepository
 * Follows Clean Architecture patterns - calls Rust backend commands
 */
export class TauriMentionRepository implements IMentionRepository {
  private projectPathCache = new Map<string, string>();

  private async resolveProjectPath(projectIdOrPath: string): Promise<string | null> {
    if (projectIdOrPath.includes("/") || projectIdOrPath.includes("\\")) {
      return projectIdOrPath;
    }

    const cached = this.projectPathCache.get(projectIdOrPath);
    if (cached) return cached;

    const projects = await listProjects();
    const project = projects.find((p) => p.id === projectIdOrPath);
    if (!project?.path) {
      return null;
    }

    this.projectPathCache.set(projectIdOrPath, project.path);
    return project.path;
  }

  /**
   * Get all mentions of a codex entry
   */
  async getByCodexEntry(
    projectId: string,
    codexEntryId: string,
  ): Promise<Mention[]> {
    try {
      const projectPath = await this.resolveProjectPath(projectId);
      if (!projectPath) return [];

      return await invoke<Mention[]>("find_mentions", {
        projectPath,
        codexEntryId,
      });
    } catch (error) {
      log.error("Failed to get mentions by codex entry:", error);
      return [];
    }
  }

  /**
   * Get count of mentions for a codex entry
   */
  async countByCodexEntry(
    projectId: string,
    codexEntryId: string,
  ): Promise<number> {
    try {
      const projectPath = await this.resolveProjectPath(projectId);
      if (!projectPath) return 0;

      return await invoke<number>("count_mentions", {
        projectPath,
        codexEntryId,
      });
    } catch (error) {
      log.error("Failed to count mentions by codex entry:", error);
      return 0;
    }
  }

  /**
   * Rebuild the mention index for a project
   * Currently not implemented server-side - mentions are computed on-demand
   */
  async rebuildIndex(projectId: string): Promise<void> {
    void projectId;
    // No-op: Mentions are computed on-demand, not stored
    // Could be implemented for performance optimization in the future
  }

  /**
   * Get all mentions in a project grouped by codex entry
   * Not yet implemented - would need a new backend command
   */
  async getAllByProject(
    projectId: string,
  ): Promise<Record<string, Mention[]>> {
    void projectId;
    // Not implemented yet - would require backend support
    return {};
  }
}

// Singleton instance
let _mentionRepository: TauriMentionRepository | null = null;

/**
 * Get the singleton MentionRepository instance.
 * Lazily initialized on first access.
 */
export function getMentionRepository(): TauriMentionRepository {
  if (!_mentionRepository) {
    _mentionRepository = new TauriMentionRepository();
  }
  return _mentionRepository;
}
