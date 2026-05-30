/**
 * Tauri Scene Note Repository
 * Implements SceneNoteRepository using Tauri commands
 */

import type { ISceneNoteRepository } from "@/domain/repositories/ISceneNoteRepository";
import type { SceneNote } from "@/domain/entities/types";
import { getSceneNote, saveSceneNote, deleteSceneNote } from "@/core/tauri";
import { invalidateQueries } from "@/hooks/use-live-query";
import { logger } from "@/shared/utils/logger";
import { AppError, toAppError } from "@/shared/errors/app-error";
import { useProjectStore } from "@/store/use-project-store";

const log = logger.scope("TauriSceneNoteRepository");

export class TauriSceneNoteRepository implements ISceneNoteRepository {
  private requireProjectPath(): string {
    const path = useProjectStore.getState().activeProjectPath;
    if (!path) {
      throw new AppError("E_PROJECT_NOT_OPEN", "No project is currently open", {
        recoverable: true,
      });
    }
    return path;
  }

  async getBySceneId(sceneId: string): Promise<SceneNote | null> {
    const projectPath = this.requireProjectPath();

    try {
      return await getSceneNote(projectPath, sceneId);
    } catch (error) {
      log.error("Failed to get scene note:", error);
      throw toAppError(
        error,
        "E_SCENE_NOTE_GET_FAILED",
        "Failed to load scene note",
      );
    }
  }

  async save(note: SceneNote): Promise<SceneNote> {
    const projectPath = this.requireProjectPath();

    try {
      const updatedNote = {
        ...note,
        updatedAt: Date.now(),
      };
      await saveSceneNote(projectPath, updatedNote);
      invalidateQueries("scene-notes");
      return updatedNote;
    } catch (error) {
      log.error("Failed to save scene note:", error);
      throw toAppError(
        error,
        "E_SCENE_NOTE_SAVE_FAILED",
        "Failed to save scene note",
      );
    }
  }

  async delete(sceneId: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      await deleteSceneNote(projectPath, sceneId);
      invalidateQueries("scene-notes");
    } catch (error) {
      log.error("Failed to delete scene note:", error);
      throw toAppError(
        error,
        "E_SCENE_NOTE_DELETE_FAILED",
        "Failed to delete scene note",
      );
    }
  }
}
