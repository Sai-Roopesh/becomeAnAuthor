/**
 * Tauri Snippet Repository
 * Implements ISnippetRepository using file system through Tauri commands
 */

import type { ISnippetRepository } from "@/domain/repositories/ISnippetRepository";
import type { Snippet } from "@/domain/entities/types";
import { listSnippets, saveSnippet, deleteSnippet } from "@/core/tauri";
import { requireCurrentProjectPath } from "@/core/project-path";
import { logger } from "@/shared/utils/logger";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("TauriSnippetRepository");

/**
 * Tauri-based Snippet Repository
 * Stores snippets as JSON files in ~/BecomeAnAuthor/Projects/{project}/snippets/
 */
export class TauriSnippetRepository implements ISnippetRepository {
  private requireProjectPath(): string {
    return requireCurrentProjectPath();
  }

  async get(id: string): Promise<Snippet | undefined> {
    this.requireProjectPath();

    const snippets = await this.getByProject("current");
    return snippets.find((s) => s.id === id);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getByProject(_projectId: string): Promise<Snippet[]> {
    const projectPath = this.requireProjectPath();

    try {
      return await listSnippets(projectPath);
    } catch (error) {
      log.error("Failed to list snippets:", error);
      throw toAppError(
        error,
        "E_SNIPPET_LIST_FAILED",
        "Failed to load snippets",
      );
    }
  }

  async getPinned(projectId: string): Promise<Snippet[]> {
    const snippets = await this.getByProject(projectId);
    return snippets.filter((s) => s.pinned);
  }

  async create(
    snippet: Partial<Snippet> & { projectId: string; title: string },
  ): Promise<Snippet> {
    const projectPath = this.requireProjectPath();

    const now = Date.now();
    const newSnippet: Snippet = {
      id: crypto.randomUUID(),
      projectId: snippet.projectId,
      title: snippet.title,
      content: snippet.content ?? { type: "doc", content: [] },
      pinned: snippet.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await saveSnippet(projectPath, newSnippet);
      return newSnippet;
    } catch (error) {
      log.error("Failed to create snippet:", error);
      throw toAppError(
        error,
        "E_SNIPPET_CREATE_FAILED",
        "Failed to create snippet",
      );
    }
  }

  async update(id: string, data: Partial<Snippet>): Promise<void> {
    const projectPath = this.requireProjectPath();

    const existing = await this.get(id);
    if (!existing) return;

    const updated: Snippet = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    try {
      await saveSnippet(projectPath, updated);
    } catch (error) {
      log.error("Failed to update snippet:", error);
      throw toAppError(
        error,
        "E_SNIPPET_UPDATE_FAILED",
        "Failed to update snippet",
      );
    }
  }

  async togglePin(id: string): Promise<void> {
    const snippet = await this.get(id);
    if (snippet) {
      await this.update(id, { pinned: !snippet.pinned });
    }
  }

  async delete(id: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      await deleteSnippet(projectPath, id);
    } catch (error) {
      log.error("Failed to delete snippet:", error);
      throw toAppError(
        error,
        "E_SNIPPET_DELETE_FAILED",
        "Failed to delete snippet",
      );
    }
  }
}
