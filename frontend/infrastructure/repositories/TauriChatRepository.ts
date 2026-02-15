/**
 * Tauri Chat Repository
 * Implements IChatRepository using file system through Tauri commands
 */

import type { IChatRepository } from "@/domain/repositories/IChatRepository";
import type { ChatThread, ChatMessage } from "@/domain/entities/types";
import {
  listChatThreads,
  getChatThread,
  createChatThread,
  updateChatThread,
  deleteChatThread,
  getChatMessages,
  createChatMessage,
  updateChatMessage,
  deleteChatMessage,
} from "@/core/tauri";
import { TauriNodeRepository } from "./TauriNodeRepository";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriChatRepository");
const DELETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function refreshQueries(): Promise<void> {
  const { invalidateQueries } = await import("@/hooks/use-live-query");
  invalidateQueries("chat");
}

/**
 * Tauri-based Chat Repository
 * Stores chat threads with embedded messages as JSON files in ~/BecomeAnAuthor/Projects/{project}/.meta/chat/threads/
 */
export class TauriChatRepository implements IChatRepository {
  private getProjectPath(): string | null {
    return TauriNodeRepository.getInstance().getProjectPath();
  }

  private async findThreadIdForMessage(
    projectPath: string,
    messageId: string,
  ): Promise<string | undefined> {
    const threads = await listChatThreads(projectPath);
    for (const thread of threads) {
      const messages = await getChatMessages(projectPath, thread.id);
      if (messages.some((m) => m.id === messageId)) {
        return thread.id;
      }
    }
    return undefined;
  }

  // ============ Thread Operations ============

  async get(id: string): Promise<ChatThread | undefined> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return undefined;

    try {
      const result = await getChatThread(projectPath, id);
      return result || undefined;
    } catch (error) {
      log.error("Failed to get chat thread:", error);
      return undefined;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getThreadsByProject(_projectId: string): Promise<ChatThread[]> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return [];

    try {
      return await listChatThreads(projectPath);
    } catch (error) {
      log.error("Failed to list chat threads:", error);
      return [];
    }
  }

  async getActiveThreads(projectId: string): Promise<ChatThread[]> {
    const threads = await this.getThreadsByProject(projectId);
    return threads
      .filter((t) => !t.archived && !t.deletedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getArchivedThreads(projectId: string): Promise<ChatThread[]> {
    const threads = await this.getThreadsByProject(projectId);
    return threads
      .filter((t) => t.archived && !t.deletedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getDeletedThreads(projectId: string): Promise<ChatThread[]> {
    const threads = await this.getThreadsByProject(projectId);
    const now = Date.now();
    const staleThreads = threads.filter(
      (thread) =>
        typeof thread.deletedAt === "number" &&
        now - thread.deletedAt > DELETED_RETENTION_MS,
    );

    for (const stale of staleThreads) {
      await this.purgeThread(stale.id);
    }

    const refreshed =
      staleThreads.length > 0
        ? await this.getThreadsByProject(projectId)
        : threads;

    return refreshed
      .filter((thread) => typeof thread.deletedAt === "number")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async createThread(
    thread: Partial<ChatThread> & { projectId: string; name: string },
  ): Promise<ChatThread> {
    const projectPath = this.getProjectPath();
    if (!projectPath) {
      throw new Error("No project path set");
    }

    // Build complete ChatThread object matching backend structure
    const now = Date.now();
    const newThread = {
      id: crypto.randomUUID(),
      projectId: thread.projectId,
      name: thread.name,
      pinned: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    if (thread.defaultModel) {
      Object.assign(newThread, { defaultModel: thread.defaultModel });
    }

    try {
      const created = await createChatThread(projectPath, newThread);
      await refreshQueries();
      return created;
    } catch (error) {
      log.error("Failed to create chat thread:", error);
      throw error;
    }
  }

  async updateThread(id: string, data: Partial<ChatThread>): Promise<void> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return;

    // Backend expects full ChatThread object, so fetch current thread and merge
    const currentThread = await this.get(id);
    if (!currentThread) throw new Error("Thread not found");

    const updatedThread: ChatThread = {
      ...currentThread,
      ...data,
      id: currentThread.id, // Ensure ID doesn't change
      updatedAt: Date.now(),
    };

    try {
      await updateChatThread(projectPath, updatedThread);
      await refreshQueries();
    } catch (error) {
      log.error("Failed to update chat thread:", error);
      throw error;
    }
  }

  async deleteThread(id: string): Promise<void> {
    await this.updateThread(id, {
      archived: false,
      pinned: false,
      deletedAt: Date.now(),
    });
  }

  async purgeThread(id: string): Promise<void> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return;

    try {
      await deleteChatThread(projectPath, id);
      await refreshQueries();
    } catch (error) {
      log.error("Failed to permanently delete chat thread:", error);
      throw error;
    }
  }

  async restoreThread(id: string): Promise<void> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return;

    const currentThread = await this.get(id);
    if (!currentThread) throw new Error("Thread not found");

    const { deletedAt, ...rest } = currentThread;
    void deletedAt;
    await updateChatThread(projectPath, {
      ...rest,
      archived: false,
      updatedAt: Date.now(),
    });
    await refreshQueries();
  }

  // ============ Message Operations ============

  async getMessage(id: string): Promise<ChatMessage | undefined> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return undefined;

    const threadId = await this.findThreadIdForMessage(projectPath, id);
    if (!threadId) return undefined;

    const messages = await getChatMessages(projectPath, threadId);
    return messages.find((m) => m.id === id);
  }

  async getMessagesByThread(threadId: string): Promise<ChatMessage[]> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return [];

    try {
      return await getChatMessages(projectPath, threadId);
    } catch (error) {
      log.error("Failed to get chat messages:", error);
      return [];
    }
  }

  async createMessage(
    message: Partial<ChatMessage> & {
      threadId: string;
      role: "user" | "assistant";
      content: string;
    },
  ): Promise<ChatMessage> {
    const projectPath = this.getProjectPath();
    if (!projectPath) {
      throw new Error("No project path set");
    }

    // Backend expects full ChatMessage object
    const newMessage: ChatMessage = {
      id: message.id || crypto.randomUUID(),
      threadId: message.threadId,
      role: message.role,
      content: message.content,
      ...(message.model !== undefined && { model: message.model }),
      timestamp: message.timestamp ?? Date.now(),
    };

    try {
      const created = await createChatMessage(projectPath, newMessage);
      await refreshQueries();
      return created;
    } catch (error) {
      log.error("Failed to create chat message:", error);
      throw error;
    }
  }

  async updateMessage(id: string, data: Partial<ChatMessage>): Promise<void> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return;

    const threadId = await this.findThreadIdForMessage(projectPath, id);
    if (!threadId) {
      throw new Error("Message not found");
    }

    const messages = await getChatMessages(projectPath, threadId);
    const existing = messages.find((m) => m.id === id);
    if (!existing) {
      throw new Error("Message not found");
    }

    const updated: ChatMessage = {
      ...existing,
      ...data,
      id: existing.id,
      threadId: existing.threadId,
      timestamp: existing.timestamp,
    };

    try {
      await updateChatMessage(projectPath, threadId, updated);
      await refreshQueries();
    } catch (error) {
      log.error("Failed to update chat message:", error);
      throw error;
    }
  }

  async deleteMessage(id: string): Promise<void> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return;

    const threadId = await this.findThreadIdForMessage(projectPath, id);
    if (!threadId) return;

    try {
      await deleteChatMessage(projectPath, threadId, id);
      await refreshQueries();
    } catch (error) {
      log.error("Failed to delete chat message:", error);
      throw error;
    }
  }

  // Helper for when we know the thread ID
  async deleteMessageFromThread(
    threadId: string,
    messageId: string,
  ): Promise<void> {
    const projectPath = this.getProjectPath();
    if (!projectPath) return;

    try {
      await deleteChatMessage(projectPath, threadId, messageId);
      await refreshQueries();
    } catch (error) {
      log.error("Failed to delete chat message:", error);
      throw error;
    }
  }

  async bulkDeleteMessages(ids: string[]): Promise<void> {
    const projectPath = this.getProjectPath();
    if (!projectPath || ids.length === 0) return;

    const idSet = new Set(ids);
    const threads = await listChatThreads(projectPath);

    for (const thread of threads) {
      const messages = await getChatMessages(projectPath, thread.id);
      for (const message of messages) {
        if (idSet.has(message.id)) {
          await deleteChatMessage(projectPath, thread.id, message.id);
        }
      }
    }

    await refreshQueries();
  }
}
