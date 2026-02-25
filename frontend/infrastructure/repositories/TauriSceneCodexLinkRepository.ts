/**
 * Tauri Scene Codex Link Repository
 * Implements ISceneCodexLinkRepository using file system through Tauri commands
 */

import type { ISceneCodexLinkRepository } from "@/domain/repositories/ISceneCodexLinkRepository";
import type {
  SceneCodexLink,
  SceneCodexLinkRole,
} from "@/domain/entities/types";
import {
  listSceneCodexLinks,
  saveSceneCodexLink,
  deleteSceneCodexLink,
} from "@/core/tauri";
import { requireCurrentProjectPath } from "@/core/project-path";
import { logger } from "@/shared/utils/logger";
import { invalidateQueries } from "@/hooks/use-live-query";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("TauriSceneCodexLinkRepository");

export class TauriSceneCodexLinkRepository implements ISceneCodexLinkRepository {
  private requireProjectPath(): string {
    return requireCurrentProjectPath();
  }

  private notifyLinksChanged(): void {
    invalidateQueries(["scene-codex-links", "codex"]);
  }

  private async getAllLinks(): Promise<SceneCodexLink[]> {
    const projectPath = this.requireProjectPath();

    try {
      return await listSceneCodexLinks(projectPath);
    } catch (error) {
      log.error("Failed to list scene codex links:", error);
      throw toAppError(
        error,
        "E_SCENE_CODEX_LINK_LIST_FAILED",
        "Failed to load scene-codex links",
      );
    }
  }

  async getByScene(sceneId: string): Promise<SceneCodexLink[]> {
    const links = await this.getAllLinks();
    return links.filter((l) => l.sceneId === sceneId);
  }

  async getByCodex(codexId: string): Promise<SceneCodexLink[]> {
    const links = await this.getAllLinks();
    return links.filter((l) => l.codexId === codexId);
  }

  async getByProject(_projectId: string): Promise<SceneCodexLink[]> {
    return await this.getAllLinks();
  }

  async getByRole(
    _projectId: string,
    role: SceneCodexLinkRole,
  ): Promise<SceneCodexLink[]> {
    const links = await this.getAllLinks();
    return links.filter((l) => l.role === role);
  }

  async exists(sceneId: string, codexId: string): Promise<boolean> {
    const links = await this.getAllLinks();
    return links.some((l) => l.sceneId === sceneId && l.codexId === codexId);
  }

  async create(
    link: Omit<SceneCodexLink, "id" | "createdAt" | "updatedAt">,
  ): Promise<SceneCodexLink> {
    const projectPath = this.requireProjectPath();

    const existing = (await this.getAllLinks()).find(
      (item) => item.sceneId === link.sceneId && item.codexId === link.codexId,
    );
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const newLink: SceneCodexLink = {
      ...link,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await saveSceneCodexLink(projectPath, newLink);
      this.notifyLinksChanged();
      return newLink;
    } catch (error) {
      log.error("Failed to create scene codex link:", error);
      throw toAppError(
        error,
        "E_SCENE_CODEX_LINK_CREATE_FAILED",
        "Failed to create scene-codex link",
      );
    }
  }

  async createMany(
    links: Omit<SceneCodexLink, "id" | "createdAt" | "updatedAt">[],
  ): Promise<SceneCodexLink[]> {
    const results: SceneCodexLink[] = [];
    for (const link of links) {
      const created = await this.create(link);
      results.push(created);
    }
    return results;
  }

  async update(
    id: string,
    updates: Partial<Pick<SceneCodexLink, "role">>,
  ): Promise<void> {
    const projectPath = this.requireProjectPath();

    const links = await this.getAllLinks();
    const existing = links.find((l) => l.id === id);
    if (!existing) return;

    const updated: SceneCodexLink = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    try {
      await saveSceneCodexLink(projectPath, updated);
      this.notifyLinksChanged();
    } catch (error) {
      log.error("Failed to update scene codex link:", error);
      throw toAppError(
        error,
        "E_SCENE_CODEX_LINK_UPDATE_FAILED",
        "Failed to update scene-codex link",
      );
    }
  }

  async delete(id: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      await deleteSceneCodexLink(projectPath, id);
      this.notifyLinksChanged();
    } catch (error) {
      log.error("Failed to delete scene codex link:", error);
      throw toAppError(
        error,
        "E_SCENE_CODEX_LINK_DELETE_FAILED",
        "Failed to delete scene-codex link",
      );
    }
  }

  async deleteByScene(sceneId: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      const links = await this.getByScene(sceneId);
      for (const link of links) {
        await deleteSceneCodexLink(projectPath, link.id);
      }
      this.notifyLinksChanged();
    } catch (error) {
      log.error("Failed to delete links by scene:", error);
      throw toAppError(
        error,
        "E_SCENE_CODEX_LINK_DELETE_FAILED",
        "Failed to delete scene links",
      );
    }
  }

  async deleteByCodex(codexId: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      const links = await this.getByCodex(codexId);
      for (const link of links) {
        await deleteSceneCodexLink(projectPath, link.id);
      }
      this.notifyLinksChanged();
    } catch (error) {
      log.error("Failed to delete links by codex:", error);
      throw toAppError(
        error,
        "E_SCENE_CODEX_LINK_DELETE_FAILED",
        "Failed to delete codex links",
      );
    }
  }

  async deleteAutoDetected(sceneId: string): Promise<void> {
    const projectPath = this.requireProjectPath();

    try {
      const links = await this.getByScene(sceneId);
      for (const link of links.filter((l) => l.autoDetected)) {
        await deleteSceneCodexLink(projectPath, link.id);
      }
      this.notifyLinksChanged();
    } catch (error) {
      log.error("Failed to delete auto-detected links:", error);
      throw toAppError(
        error,
        "E_SCENE_CODEX_LINK_DELETE_FAILED",
        "Failed to delete auto-detected links",
      );
    }
  }
}
