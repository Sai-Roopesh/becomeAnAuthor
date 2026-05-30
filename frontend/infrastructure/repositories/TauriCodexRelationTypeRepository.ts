/**
 * Tauri Codex Relation Type Repository
 * Implements ICodexRelationTypeRepository using file system through Tauri commands
 */

import type { ICodexRelationTypeRepository } from "@/domain/repositories/ICodexRelationTypeRepository";
import type { CodexRelationType } from "@/domain/entities/types";
import {
  listCodexRelationTypes,
  saveCodexRelationType,
  deleteCodexRelationType,
} from "@/core/tauri";
import { invalidateQueries } from "@/hooks/use-live-query";
import { logger } from "@/shared/utils/logger";
import { AppError, toAppError } from "@/shared/errors/app-error";
import { useProjectStore } from "@/store/use-project-store";

const log = logger.scope("TauriCodexRelationTypeRepository");

export class TauriCodexRelationTypeRepository implements ICodexRelationTypeRepository {
  private requireProjectPath(): string {
    const path = useProjectStore.getState().activeProjectPath;
    if (!path) {
      throw new AppError("E_PROJECT_NOT_OPEN", "No project is currently open", {
        recoverable: true,
      });
    }
    return path;
  }

  async get(id: string): Promise<CodexRelationType | undefined> {
    const projectPath = this.requireProjectPath();

    try {
      const types = await listCodexRelationTypes(projectPath);
      return types.find((t) => t.id === id);
    } catch (error) {
      log.error("Failed to get codex relation type:", error);
      throw toAppError(
        error,
        "E_CODEX_RELATION_TYPE_GET_FAILED",
        "Failed to load relation type",
      );
    }
  }

  async getAll(): Promise<CodexRelationType[]> {
    const projectPath = this.requireProjectPath();

    try {
      return await listCodexRelationTypes(projectPath);
    } catch (error) {
      log.error("Failed to list codex relation types:", error);
      throw toAppError(
        error,
        "E_CODEX_RELATION_TYPE_LIST_FAILED",
        "Failed to load relation types",
      );
    }
  }

  async getByCategory(category: string): Promise<CodexRelationType[]> {
    const types = await this.getAll();
    return types.filter((t) => t.category === category);
  }

  async getBuiltIn(): Promise<CodexRelationType[]> {
    const types = await this.getAll();
    return types.filter((t) => t.isBuiltIn);
  }

  async create(
    type: Omit<CodexRelationType, "id">,
  ): Promise<CodexRelationType> {
    const projectPath = this.requireProjectPath();

    const newType: CodexRelationType = {
      ...type,
      id: crypto.randomUUID(),
    } as CodexRelationType;

    try {
      await saveCodexRelationType(projectPath, newType);
      invalidateQueries("codex");
      return newType;
    } catch (error) {
      log.error("Failed to create codex relation type:", error);
      throw toAppError(
        error,
        "E_CODEX_RELATION_TYPE_CREATE_FAILED",
        "Failed to create relation type",
      );
    }
  }

  async update(id: string, data: Partial<CodexRelationType>): Promise<void> {
    const projectPath = this.requireProjectPath();

    const existing = await this.get(id);
    if (!existing) return;

    const updated = { ...existing, ...data };
    try {
      await saveCodexRelationType(projectPath, updated);
      invalidateQueries("codex");
    } catch (error) {
      log.error("Failed to update codex relation type:", error);
      throw toAppError(
        error,
        "E_CODEX_RELATION_TYPE_UPDATE_FAILED",
        "Failed to update relation type",
      );
    }
  }

  async delete(id: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      await deleteCodexRelationType(projectPath, id);
      invalidateQueries("codex");
    } catch (error) {
      log.error("Failed to delete codex relation type:", error);
      throw toAppError(
        error,
        "E_CODEX_RELATION_TYPE_DELETE_FAILED",
        "Failed to delete relation type",
      );
    }
  }
}
