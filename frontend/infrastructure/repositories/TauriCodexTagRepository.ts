/**
 * Tauri Codex Tag Repository
 * Implements ICodexTagRepository using file system through Tauri commands
 */

import type { ICodexTagRepository } from "@/domain/repositories/ICodexTagRepository";
import type { CodexTag } from "@/domain/entities/types";
import {
  listCodexTags,
  saveCodexTag,
  deleteCodexTag,
  listCodexEntryTags,
  saveCodexEntryTag,
  deleteCodexEntryTag,
} from "@/core/tauri";
import { requireCurrentProjectPath } from "@/core/project-path";
import { logger } from "@/shared/utils/logger";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("TauriCodexTagRepository");

export class TauriCodexTagRepository implements ICodexTagRepository {
  private requireProjectPath(): string {
    return requireCurrentProjectPath();
  }

  async get(id: string): Promise<CodexTag | undefined> {
    const projectPath = this.requireProjectPath();

    try {
      const tags = await listCodexTags(projectPath);
      return tags.find((t) => t.id === id);
    } catch (error) {
      log.error("Failed to get codex tag:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_GET_FAILED",
        "Failed to load codex tag",
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getByProject(_projectId: string): Promise<CodexTag[]> {
    const projectPath = this.requireProjectPath();

    try {
      return await listCodexTags(projectPath);
    } catch (error) {
      log.error("Failed to list codex tags:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_LIST_FAILED",
        "Failed to load codex tags",
      );
    }
  }

  async getByCategory(
    projectId: string,
    category: string,
  ): Promise<CodexTag[]> {
    const tags = await this.getByProject(projectId);
    return tags.filter((t) => t.category === category);
  }

  async create(
    tag: Omit<CodexTag, "id" | "createdAt" | "updatedAt">,
  ): Promise<CodexTag> {
    const projectPath = this.requireProjectPath();

    const now = Date.now();
    const newTag: CodexTag = {
      ...tag,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as CodexTag;

    try {
      await saveCodexTag(projectPath, newTag);
      return newTag;
    } catch (error) {
      log.error("Failed to create codex tag:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_CREATE_FAILED",
        "Failed to create codex tag",
      );
    }
  }

  async update(id: string, data: Partial<CodexTag>): Promise<void> {
    const projectPath = this.requireProjectPath();

    const existing = await this.get(id);
    if (!existing) return;

    const updated = { ...existing, ...data };
    try {
      await saveCodexTag(projectPath, updated);
    } catch (error) {
      log.error("Failed to update codex tag:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_UPDATE_FAILED",
        "Failed to update codex tag",
      );
    }
  }

  async delete(id: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      await deleteCodexTag(projectPath, id);
    } catch (error) {
      log.error("Failed to delete codex tag:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_DELETE_FAILED",
        "Failed to delete codex tag",
      );
    }
  }

  // Entry-Tag associations using codex_entry_tags.json
  async addTagToEntry(entryId: string, tagId: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    const entryTag = {
      id: crypto.randomUUID(),
      entryId: entryId,
      tagId: tagId,
    };

    try {
      await saveCodexEntryTag(projectPath, entryTag);
    } catch (error) {
      log.error("Failed to add tag to entry:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_LINK_FAILED",
        "Failed to add tag to entry",
      );
    }
  }

  async removeTagFromEntry(entryId: string, tagId: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      const entryTags = await listCodexEntryTags(projectPath);
      const toDelete = entryTags.find(
        (et) => et.entryId === entryId && et.tagId === tagId,
      );
      if (toDelete) {
        await deleteCodexEntryTag(projectPath, toDelete.id);
      }
    } catch (error) {
      log.error("Failed to remove tag from entry:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_UNLINK_FAILED",
        "Failed to remove tag from entry",
      );
    }
  }

  async getEntriesByTag(tagId: string): Promise<string[]> {
    const projectPath = this.requireProjectPath();

    try {
      const entryTags = await listCodexEntryTags(projectPath);
      return entryTags
        .filter((et) => et.tagId === tagId)
        .map((et) => et.entryId);
    } catch (error) {
      log.error("Failed to get entries by tag:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_LOOKUP_FAILED",
        "Failed to load tagged entries",
      );
    }
  }

  async getTagsByEntry(entryId: string): Promise<CodexTag[]> {
    const projectPath = this.requireProjectPath();

    try {
      const allTags = await this.getByProject("current");
      const entryTags = await listCodexEntryTags(projectPath);
      const tagIds = entryTags
        .filter((et) => et.entryId === entryId)
        .map((et) => et.tagId);
      return allTags.filter((t) => tagIds.includes(t.id));
    } catch (error) {
      log.error("Failed to get tags by entry:", error);
      throw toAppError(
        error,
        "E_CODEX_TAG_LOOKUP_FAILED",
        "Failed to load entry tags",
      );
    }
  }
}
