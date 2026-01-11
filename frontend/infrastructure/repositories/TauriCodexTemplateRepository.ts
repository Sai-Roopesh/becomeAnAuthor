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
import { TauriNodeRepository } from "./TauriNodeRepository";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriCodexTemplateRepository");

export class TauriCodexTemplateRepository implements ICodexTemplateRepository {
  async get(id: string): Promise<CodexTemplate | undefined> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return undefined;

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.find((t) => t.id === id);
    } catch (error) {
      log.error("Failed to get codex template:", error);
      return undefined;
    }
  }

  async getByCategory(category: CodexCategory): Promise<CodexTemplate[]> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return [];

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.filter((t) => t.category === category);
    } catch (error) {
      log.error("Failed to list codex templates by category:", error);
      return [];
    }
  }

  async getBuiltInTemplates(): Promise<CodexTemplate[]> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return [];

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.filter((t) => t.isBuiltIn);
    } catch (error) {
      log.error("Failed to get built-in templates:", error);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCustomTemplates(_projectId: string): Promise<CodexTemplate[]> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return [];

    try {
      const templates = await listCodexTemplates(projectPath);
      return templates.filter((t) => !t.isBuiltIn);
    } catch (error) {
      log.error("Failed to get custom templates:", error);
      return [];
    }
  }

  async create(
    template: Omit<CodexTemplate, "id" | "createdAt">,
  ): Promise<CodexTemplate> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) throw new Error("No project path set");

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
      throw error;
    }
  }

  async update(id: string, data: Partial<CodexTemplate>): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return;

    const existing = await this.get(id);
    if (!existing) return;

    const updated = { ...existing, ...data };
    try {
      await saveCodexTemplate(projectPath, updated);
    } catch (error) {
      log.error("Failed to update codex template:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return;

    try {
      await deleteCodexTemplate(projectPath, id);
    } catch (error) {
      log.error("Failed to delete codex template:", error);
      throw error;
    }
  }
}
