/**
 * Tauri Chat Repository
 * Implements IChatRepository using file system through Tauri commands
 */

import type { IChatRepository } from '@/domain/repositories/IChatRepository';
import type { ChatThread, ChatMessage } from '@/domain/entities/types';
import {
    listChatThreads,
    getChatThread,
    createChatThread,
    updateChatThread,
    deleteChatThread,
    getChatMessages,
    createChatMessage,
    deleteChatMessage
} from '@/lib/tauri';
import { getCurrentProjectPath } from './TauriNodeRepository';

/**
 * Tauri-based Chat Repository
 * Stores chat threads with embedded messages as JSON files in ~/BecomeAnAuthor/Projects/{project}/.meta/chat/threads/
 */
export class TauriChatRepository implements IChatRepository {
    // ============ Thread Operations ============

    async getThread(id: string): Promise<ChatThread | undefined> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return undefined;

        try {
            const result = await getChatThread(projectPath, id);
            return result as unknown as ChatThread || undefined;
        } catch (error) {
            console.error('Failed to get chat thread:', error);
            return undefined;
        }
    }

    async getThreadsByProject(projectId: string): Promise<ChatThread[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await listChatThreads(projectPath) as unknown as ChatThread[];
        } catch (error) {
            console.error('Failed to list chat threads:', error);
            return [];
        }
    }

    async getActiveThreads(projectId: string): Promise<ChatThread[]> {
        const threads = await this.getThreadsByProject(projectId);
        return threads
            .filter(t => !t.archived)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    async createThread(thread: Partial<ChatThread> & { projectId: string; name: string }): Promise<ChatThread> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        // Build complete ChatThread object matching backend structure
        const now = Date.now();
        const newThread = {
            id: crypto.randomUUID(),
            projectId: thread.projectId,
            name: thread.name,
            pinned: false,
            archived: false,
            defaultModel: null,
            createdAt: now,
            updatedAt: now,
        };

        try {
            return await createChatThread(projectPath, newThread as any) as unknown as ChatThread;
        } catch (error) {
            console.error('Failed to create chat thread:', error);
            throw error;
        }
    }

    async updateThread(id: string, data: Partial<ChatThread>): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        // Backend expects full ChatThread object, so fetch current thread and merge
        const currentThread = await this.getThread(id);
        if (!currentThread) throw new Error('Thread not found');

        const updatedThread: ChatThread = {
            ...currentThread,
            ...data,
            id: currentThread.id, // Ensure ID doesn't change
            updatedAt: Date.now(),
        };

        try {
            await updateChatThread(projectPath, id, updatedThread as any);
        } catch (error) {
            console.error('Failed to update chat thread:', error);
            throw error;
        }
    }

    async deleteThread(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            await deleteChatThread(projectPath, id);
        } catch (error) {
            console.error('Failed to delete chat thread:', error);
            throw error;
        }
    }

    // ============ Message Operations ============

    async getMessage(id: string): Promise<ChatMessage | undefined> {
        // To get a specific message, we'd need to know the thread ID
        // For now, this is not efficiently supported by the file-based approach
        console.warn('TauriChatRepository.getMessage: Not efficient for file-based storage');
        return undefined;
    }

    async getMessagesByThread(threadId: string): Promise<ChatMessage[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await getChatMessages(projectPath, threadId) as unknown as ChatMessage[];
        } catch (error) {
            console.error('Failed to get chat messages:', error);
            return [];
        }
    }

    async createMessage(message: Partial<ChatMessage> & { threadId: string; role: 'user' | 'assistant'; content: string }): Promise<ChatMessage> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) {
            throw new Error('No project path set');
        }

        // Backend expects full ChatMessage object
        const newMessage: ChatMessage = {
            id: message.id || crypto.randomUUID(),
            threadId: message.threadId,
            role: message.role,
            content: message.content,
            model: message.model || undefined,
            timestamp: Date.now(),
        };

        try {
            return await createChatMessage(projectPath, newMessage as any) as unknown as ChatMessage;
        } catch (error) {
            console.error('Failed to create chat message:', error);
            throw error;
        }
    }

    async updateMessage(id: string, data: Partial<ChatMessage>): Promise<void> {
        // Message updates are not commonly needed in this app
        console.warn('TauriChatRepository.updateMessage: Not implemented');
    }

    async deleteMessage(id: string): Promise<void> {
        // Need thread ID to delete message efficiently
        console.warn('TauriChatRepository.deleteMessage: Requires threadId');
    }

    // Helper for when we know the thread ID
    async deleteMessageFromThread(threadId: string, messageId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        try {
            await deleteChatMessage(projectPath, threadId, messageId);
        } catch (error) {
            console.error('Failed to delete chat message:', error);
            throw error;
        }
    }

    async bulkDeleteMessages(ids: string[]): Promise<void> {
        console.warn('TauriChatRepository.bulkDeleteMessages: Not efficiently supported');
    }
}
