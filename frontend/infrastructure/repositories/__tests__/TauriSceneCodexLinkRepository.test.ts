import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneCodexLink } from "@/domain/entities/types";
import { TauriSceneCodexLinkRepository } from "../TauriSceneCodexLinkRepository";

vi.mock("@/core/tauri", () => ({
  listSceneCodexLinks: vi.fn(),
  saveSceneCodexLink: vi.fn(),
  deleteSceneCodexLink: vi.fn(),
}));

vi.mock("@/core/project-path", () => ({
  getCurrentProjectPath: () => "/mock/project/path",
  requireCurrentProjectPath: () => "/mock/project/path",
}));

vi.mock("@/hooks/use-live-query", () => ({
  invalidateQueries: vi.fn(),
}));

import * as tauriCommands from "@/core/tauri";
import { invalidateQueries } from "@/hooks/use-live-query";

function createLink(overrides: Partial<SceneCodexLink> = {}): SceneCodexLink {
  const now = Date.now();
  return {
    id: "link-1",
    sceneId: "scene-1",
    codexId: "codex-1",
    projectId: "project-1",
    role: "appears",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("TauriSceneCodexLinkRepository", () => {
  let repo: TauriSceneCodexLinkRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TauriSceneCodexLinkRepository();
  });

  it("creates a link and invalidates live queries", async () => {
    vi.mocked(tauriCommands.listSceneCodexLinks).mockResolvedValue([]);
    vi.mocked(tauriCommands.saveSceneCodexLink).mockResolvedValue(undefined);

    const created = await repo.create({
      sceneId: "scene-1",
      codexId: "codex-1",
      projectId: "project-1",
      role: "appears",
    });

    expect(created.id).toBeTruthy();
    expect(tauriCommands.saveSceneCodexLink).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith([
      "scene-codex-links",
      "codex",
    ]);
  });

  it("does not create duplicate links for the same scene and codex", async () => {
    const existing = createLink();
    vi.mocked(tauriCommands.listSceneCodexLinks).mockResolvedValue([existing]);

    const result = await repo.create({
      sceneId: "scene-1",
      codexId: "codex-1",
      projectId: "project-1",
      role: "appears",
    });

    expect(result).toEqual(existing);
    expect(tauriCommands.saveSceneCodexLink).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("updates role and invalidates live queries", async () => {
    const existing = createLink();
    vi.mocked(tauriCommands.listSceneCodexLinks).mockResolvedValue([existing]);
    vi.mocked(tauriCommands.saveSceneCodexLink).mockResolvedValue(undefined);

    await repo.update(existing.id, { role: "pov" });

    expect(tauriCommands.saveSceneCodexLink).toHaveBeenCalledWith(
      "/mock/project/path",
      expect.objectContaining({
        id: existing.id,
        role: "pov",
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith([
      "scene-codex-links",
      "codex",
    ]);
  });

  it("deletes a link and invalidates live queries", async () => {
    vi.mocked(tauriCommands.deleteSceneCodexLink).mockResolvedValue(undefined);

    await repo.delete("link-1");

    expect(tauriCommands.deleteSceneCodexLink).toHaveBeenCalledWith(
      "/mock/project/path",
      "link-1",
    );
    expect(invalidateQueries).toHaveBeenCalledWith([
      "scene-codex-links",
      "codex",
    ]);
  });
});
