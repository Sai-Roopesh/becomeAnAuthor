/**
 * Tauri Collaboration Repository
 *
 * Implements ICollaborationRepository using Tauri commands.
 * Per CODING_GUIDELINES.md: Layer 5 - Tauri Repository
 *
 * NOTE: Tauri 2.0 auto-converts Rust snake_case params to JS camelCase.
 * So Rust `project_path` becomes JS `projectPath`.
 */

import type { ICollaborationRepository } from "@/domain/repositories/ICollaborationRepository";
import type { YjsStateSnapshot } from "@/domain/entities/types";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/shared/utils/logger";
import { requireCurrentProjectPath } from "@/core/project-path";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("TauriCollaborationRepository");

export class TauriCollaborationRepository implements ICollaborationRepository {
  private static instance: TauriCollaborationRepository | null = null;

  private constructor() {}

  static getInstance(): TauriCollaborationRepository {
    if (!TauriCollaborationRepository.instance) {
      TauriCollaborationRepository.instance =
        new TauriCollaborationRepository();
    }
    return TauriCollaborationRepository.instance;
  }

  private requireProjectPath(): string {
    return requireCurrentProjectPath();
  }

  async saveYjsState(
    sceneId: string,
    _projectId: string,
    update: Uint8Array,
  ): Promise<void> {
    // Project identity is part of domain contract; storage uses active project path.
    const projectPath = this.requireProjectPath();

    try {
      // Convert Uint8Array to number array for JSON serialization
      const updateArray = Array.from(update);
      // Tauri auto-converts snake_case to camelCase
      await invoke("save_yjs_state", {
        projectPath,
        sceneId,
        update: updateArray,
      });
      log.debug("Saved Yjs state", { sceneId });
    } catch (error) {
      log.error("Failed to save Yjs state", error);
      throw toAppError(
        error,
        "E_COLLAB_SAVE_FAILED",
        "Failed to save collaboration state",
      );
    }
  }

  async loadYjsState(
    sceneId: string,
    _projectId: string,
  ): Promise<YjsStateSnapshot | null> {
    const projectPath = this.requireProjectPath();

    try {
      const result = await invoke<{
        sceneId: string;
        projectId: string;
        update: number[];
        savedAt: number;
      } | null>("load_yjs_state", {
        projectPath,
        sceneId,
      });

      if (!result) return null;

      return {
        sceneId: result.sceneId,
        projectId: result.projectId,
        stateVector: new Uint8Array([]), // Empty - not stored, can be computed from doc if needed
        update: new Uint8Array(result.update),
        savedAt: result.savedAt,
      };
    } catch (error) {
      log.error("Failed to load Yjs state", error);
      throw toAppError(
        error,
        "E_COLLAB_LOAD_FAILED",
        "Failed to load collaboration state",
      );
    }
  }

  async hasYjsState(sceneId: string, _projectId: string): Promise<boolean> {
    const projectPath = this.requireProjectPath();

    try {
      return await invoke<boolean>("has_yjs_state", {
        projectPath,
        sceneId,
      });
    } catch (error) {
      throw toAppError(
        error,
        "E_COLLAB_CHECK_FAILED",
        "Failed to check collaboration state",
      );
    }
  }

  async deleteYjsState(sceneId: string, _projectId: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      await invoke("delete_yjs_state", {
        projectPath,
        sceneId,
      });
      log.debug("Deleted Yjs state", { sceneId });
    } catch (error) {
      log.error("Failed to delete Yjs state", error);
      throw toAppError(
        error,
        "E_COLLAB_DELETE_FAILED",
        "Failed to delete collaboration state",
      );
    }
  }
}

// Export singleton instance
export const collaborationRepository =
  TauriCollaborationRepository.getInstance();
