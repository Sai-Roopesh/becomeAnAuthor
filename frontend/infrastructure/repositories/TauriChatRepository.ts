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
  deleteChatMessage,
} from "@/core/tauri";
import { TauriNodeRepository } from "./TauriNodeRepository";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriChatRepository");

/**
 * Tauri-based Chat Repository
 * Stores chat threads with embedded messages as JSON files in ~/BecomeAnAuthor/Projects/{project}/.meta/chat/threads/
 */
export class TauriChatRepository implements IChatRepository {
  // ============ Thread Operations ============

  async get(id: string): Promise<ChatThread | undefined> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
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
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
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
      .filter((t) => !t.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async createThread(
    thread: Partial<ChatThread> & { projectId: string; name: string },
  ): Promise<ChatThread> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
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
      return await createChatThread(projectPath, newThread);
    } catch (error) {
      log.error("Failed to create chat thread:", error);
      throw error;
    }
  }

  async updateThread(id: string, data: Partial<ChatThread>): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
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
    } catch (error) {
      log.error("Failed to update chat thread:", error);
      throw error;
    }
  }

  async deleteThread(id: string): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return;

    try {
      await deleteChatThread(projectPath, id);
    } catch (error) {
      log.error("Failed to delete chat thread:", error);
      throw error;
    }
  }

  // ============ Message Operations ============

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMessage(_id: string): Promise<ChatMessage | undefined> {
    // To get a specific message, we'd need to know the thread ID
    // For now, this is not efficiently supported by the file-based approach
    log.warn(
      "TauriChatRepository.getMessage: Not efficient for file-based storage",
    );
    return undefined;
  }

  async getMessagesByThread(threadId: string): Promise<ChatMessage[]> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
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
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
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
      timestamp: Date.now(),
    };

    try {
      return await createChatMessage(projectPath, newMessage);
    } catch (error) {
      log.error("Failed to create chat message:", error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateMessage(_id: string, _data: Partial<ChatMessage>): Promise<void> {
    // Message editing is not supported in the current UI.
    // Messages are immutable once created.
    // If editing is needed in the future, add a Rust command: update_chat_message
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteMessage(_id: string): Promise<void> {
    // Need thread ID to delete message efficiently
    log.warn("TauriChatRepository.deleteMessage: Requires threadId");
  }

  // Helper for when we know the thread ID
  async deleteMessageFromThread(
    threadId: string,
    messageId: string,
  ): Promise<void> {
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return;

    try {
      await deleteChatMessage(projectPath, threadId, messageId);
    } catch (error) {
      log.error("Failed to delete chat message:", error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async bulkDeleteMessages(_ids: string[]): Promise<void> {
    log.warn(
      "TauriChatRepository.bulkDeleteMessages: Not efficiently supported",
    );
  }
}
