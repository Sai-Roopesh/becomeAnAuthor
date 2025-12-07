/**
 * Tauri Chat Repository
 * Implements IChatRepository using file system through Tauri commands
 */

import type { IChatRepository } from '@/domain/repositories/IChatRepository';
import type { ChatThread, ChatMessage } from '@/domain/entities/types';
import { invoke } from '@tauri-apps/api/core';
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
            // Backend returns ChatThread directly, not a wrapper
            const result = await invoke<ChatThread | null>('get_chat_thread', {
                projectPath,
                threadId: id
            });
            return result || undefined;
        } catch {
            return undefined;
        }
    }

    async getThreadsByProject(projectId: string): Promise<ChatThread[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await invoke<ChatThread[]>('list_chat_threads', { projectPath });
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
            name: thread.name, // Both frontend and backend now use 'name'
            pinned: false,
            archived: false,
            defaultModel: null,
            createdAt: now,
            updatedAt: now,
        };

        return await invoke<ChatThread>('create_chat_thread', {
            projectPath,
            thread: newThread
        });
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

        await invoke('update_chat_thread', {
            projectPath,
            thread: updatedThread
        });
    }

    async deleteThread(id: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_chat_thread', { projectPath, threadId: id });
    }

    // ============ Message Operations ============

    async getMessage(id: string): Promise<ChatMessage | undefined> {
        // To get a specific message, we'd need to know the thread ID
        // For now, this is not efficiently supported by the file-based approach
        // This could be implemented by scanning all threads, but that's expensive
        console.warn('TauriChatRepository.getMessage: Not efficient for file-based storage');
        return undefined;
    }

    async getMessagesByThread(threadId: string): Promise<ChatMessage[]> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return [];

        try {
            return await invoke<ChatMessage[]>('get_chat_messages', {
                projectPath,
                threadId
            });
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

        return await invoke<ChatMessage>('create_chat_message', {
            projectPath,
            message: newMessage
        });
    }

    async updateMessage(id: string, data: Partial<ChatMessage>): Promise<void> {
        // Message updates are not commonly needed in this app
        // Would require reading the thread file, finding the message, updating it, and writing back
        console.warn('TauriChatRepository.updateMessage: Not implemented');
    }

    async deleteMessage(id: string): Promise<void> {
        // Need thread ID to delete message efficiently
        // This would require scanning all threads to find the message
        console.warn('TauriChatRepository.deleteMessage: Requires threadId');
    }

    // Helper for when we know the thread ID
    async deleteMessageFromThread(threadId: string, messageId: string): Promise<void> {
        const projectPath = getCurrentProjectPath();
        if (!projectPath) return;

        await invoke('delete_chat_message', {
            projectPath,
            threadId,
            messageId
        });
    }

    async bulkDeleteMessages(ids: string[]): Promise<void> {
        console.warn('TauriChatRepository.bulkDeleteMessages: Not efficiently supported');
    }
}
