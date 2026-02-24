import { invoke } from "@tauri-apps/api/core";
import type { ChatMessage, ChatThread } from "@/domain/entities/types";

export async function listChatThreads(
  projectPath: string,
): Promise<ChatThread[]> {
  return invoke<ChatThread[]>("list_chat_threads", { projectPath });
}

export async function getChatThread(
  projectPath: string,
  threadId: string,
): Promise<ChatThread | null> {
  return invoke<ChatThread | null>("get_chat_thread", {
    projectPath,
    threadId,
  });
}

export async function createChatThread(
  projectPath: string,
  thread: Omit<ChatThread, "id" | "createdAt" | "updatedAt">,
): Promise<ChatThread> {
  return invoke<ChatThread>("create_chat_thread", { projectPath, thread });
}

export async function updateChatThread(
  projectPath: string,
  thread: ChatThread,
): Promise<void> {
  return invoke("update_chat_thread", { projectPath, thread });
}

export async function deleteChatThread(
  projectPath: string,
  threadId: string,
): Promise<void> {
  return invoke("delete_chat_thread", { projectPath, threadId });
}

export async function getChatMessages(
  projectPath: string,
  threadId: string,
): Promise<ChatMessage[]> {
  return invoke<ChatMessage[]>("get_chat_messages", { projectPath, threadId });
}

export async function findChatThreadForMessage(
  projectPath: string,
  messageId: string,
): Promise<string | null> {
  return invoke<string | null>("find_chat_thread_for_message", {
    projectPath,
    messageId,
  });
}

export async function createChatMessage(
  projectPath: string,
  message: ChatMessage,
): Promise<ChatMessage> {
  return invoke<ChatMessage>("create_chat_message", { projectPath, message });
}

export async function updateChatMessage(
  projectPath: string,
  threadId: string,
  message: ChatMessage,
): Promise<void> {
  return invoke("update_chat_message", { projectPath, threadId, message });
}

export async function deleteChatMessage(
  projectPath: string,
  threadId: string,
  messageId: string,
): Promise<void> {
  return invoke("delete_chat_message", { projectPath, threadId, messageId });
}
