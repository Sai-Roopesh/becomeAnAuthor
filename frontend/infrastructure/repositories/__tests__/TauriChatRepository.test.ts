import { beforeEach, describe, expect, it, vi } from "vitest";
import { TauriChatRepository } from "../TauriChatRepository";
import type { ChatThread } from "@/domain/entities/types";
import * as tauriCommands from "@/core/tauri";

vi.mock("@/core/tauri", () => ({
  listChatThreads: vi.fn(),
  getChatThread: vi.fn(),
  createChatThread: vi.fn(),
  updateChatThread: vi.fn(),
  deleteChatThread: vi.fn(),
  getChatMessages: vi.fn(),
  findChatThreadForMessage: vi.fn(),
  createChatMessage: vi.fn(),
  updateChatMessage: vi.fn(),
  deleteChatMessage: vi.fn(),
}));

vi.mock("@/core/project-path", () => ({
  requireCurrentProjectPath: vi.fn(() => "/mock/project/path"),
}));

function buildThread(
  overrides: Partial<ChatThread> & { id: string },
  now: number,
): ChatThread {
  return {
    projectId: "project-1",
    name: "Thread",
    pinned: false,
    archived: false,
    createdAt: now - 10_000,
    updatedAt: now - 1_000,
    ...overrides,
  };
}

describe("TauriChatRepository.getDeletedThreads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only deleted threads inside retention, sorted by updatedAt", async () => {
    const now = Date.now();
    const retentionMs = 30 * 24 * 60 * 60 * 1000;

    vi.mocked(tauriCommands.listChatThreads).mockResolvedValue([
      buildThread(
        {
          id: "fresh-older",
          deletedAt: now - 2 * 24 * 60 * 60 * 1000,
          updatedAt: now - 5_000,
        },
        now,
      ),
      buildThread(
        {
          id: "active",
          updatedAt: now - 100,
        },
        now,
      ),
      buildThread(
        {
          id: "stale",
          deletedAt: now - retentionMs - 1_000,
          updatedAt: now - 10,
        },
        now,
      ),
      buildThread(
        {
          id: "fresh-newer",
          deletedAt: now - 1_000,
          updatedAt: now - 1_000,
        },
        now,
      ),
    ]);

    const repo = new TauriChatRepository();
    const results = await repo.getDeletedThreads("project-1");

    expect(results.map((thread) => thread.id)).toEqual([
      "fresh-newer",
      "fresh-older",
    ]);
    expect(tauriCommands.listChatThreads).toHaveBeenCalledTimes(1);
  });

  it("does not purge stale threads during read", async () => {
    const now = Date.now();
    const retentionMs = 30 * 24 * 60 * 60 * 1000;

    vi.mocked(tauriCommands.listChatThreads).mockResolvedValue([
      buildThread(
        {
          id: "stale",
          deletedAt: now - retentionMs - 5_000,
        },
        now,
      ),
    ]);

    const repo = new TauriChatRepository();
    const results = await repo.getDeletedThreads("project-1");

    expect(results).toEqual([]);
    expect(tauriCommands.deleteChatThread).not.toHaveBeenCalled();
    expect(tauriCommands.listChatThreads).toHaveBeenCalledTimes(1);
  });
});
