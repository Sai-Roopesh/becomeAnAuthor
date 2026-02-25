/**
 * Tauri Codex Template Repository
 * Implements ICodexTemplateRepository using file system through Tauri commands
 */

import type { ICodexTemplateRepository } from "@/domain/repositories/ICodexTemplateRepository";
import type { CodexTemplate, CodexCategory } from "@/domain/entities/types";
import {
  listCodexTemplates,
  saveCodexTemplate,
  deleteCodexTemplate,
} from "@/core/tauri";
import { requireCurrentProjectPath } from "@/core/project-path";
import { logger } from "@/shared/utils/logger";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("TauriCodexTemplateRepository");

export class TauriCodexTemplateRepository implements ICodexTemplateRepository {
  private requireProjectPath(): string {
    return requireCurrentProjectPath();
  }

  async get(id: string): Promise<CodexTemplate | undefined> {
    const projectPath = this.requireProjectPath();

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.find((t) => t.id === id);
    } catch (error) {
      log.error("Failed to get codex template:", error);
      throw toAppError(
        error,
        "E_CODEX_TEMPLATE_GET_FAILED",
        "Failed to load codex template",
      );
    }
  }

  async getByCategory(category: CodexCategory): Promise<CodexTemplate[]> {
    const projectPath = this.requireProjectPath();

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.filter((t) => t.category === category);
    } catch (error) {
      log.error("Failed to list codex templates by category:", error);
      throw toAppError(
        error,
        "E_CODEX_TEMPLATE_LIST_FAILED",
        "Failed to load codex templates",
      );
    }
  }

  async getBuiltInTemplates(): Promise<CodexTemplate[]> {
    const projectPath = this.requireProjectPath();

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.filter((t) => t.isBuiltIn);
    } catch (error) {
      log.error("Failed to get built-in templates:", error);
      throw toAppError(
        error,
        "E_CODEX_TEMPLATE_LIST_FAILED",
        "Failed to load codex templates",
      );
    }
  }

  async getCustomTemplates(_projectId: string): Promise<CodexTemplate[]> {
    const projectPath = this.requireProjectPath();

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.filter((t) => !t.isBuiltIn);
    } catch (error) {
      log.error("Failed to get custom templates:", error);
      throw toAppError(
        error,
        "E_CODEX_TEMPLATE_LIST_FAILED",
        "Failed to load codex templates",
      );
    }
  }

  async create(
    template: Omit<CodexTemplate, "id" | "createdAt">,
  ): Promise<CodexTemplate> {
    const projectPath = this.requireProjectPath();

    const newTemplate: CodexTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    } as CodexTemplate;

    try {
      await saveCodexTemplate(projectPath, newTemplate);
      return newTemplate;
    } catch (error) {
      log.error("Failed to create codex template:", error);
      throw toAppError(
        error,
        "E_CODEX_TEMPLATE_CREATE_FAILED",
        "Failed to create codex template",
      );
    }
  }

  async update(id: string, data: Partial<CodexTemplate>): Promise<void> {
    const projectPath = this.requireProjectPath();

    const existing = await this.get(id);
    if (!existing) return;

    const updated = { ...existing, ...data };
    try {
      await saveCodexTemplate(projectPath, updated);
    } catch (error) {
      log.error("Failed to update codex template:", error);
      throw toAppError(
        error,
        "E_CODEX_TEMPLATE_UPDATE_FAILED",
        "Failed to update codex template",
      );
    }
  }

  async delete(id: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      await deleteCodexTemplate(projectPath, id);
    } catch (error) {
      log.error("Failed to delete codex template:", error);
      throw toAppError(
        error,
        "E_CODEX_TEMPLATE_DELETE_FAILED",
        "Failed to delete codex template",
      );
    }
  }
}
