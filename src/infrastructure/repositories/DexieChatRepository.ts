import { db } from '@/lib/db';
import type { ChatThread, ChatMessage } from '@/lib/types';
import type { IChatRepository } from '@/domain/repositories/IChatRepository';

/**
 * Dexie implementation of IChatRepository
 * Wraps all Dexie database calls for chat threads and messages
 */
export class DexieChatRepository implements IChatRepository {
    // Thread operations
    async getThread(id: string): Promise<ChatThread | undefined> {
        return await db.chatThreads.get(id);
    }

    async getThreadsByProject(projectId: string): Promise<ChatThread[]> {
        return await db.chatThreads.where('projectId').equals(projectId).toArray();
    }

    async getActiveThreads(projectId: string): Promise<ChatThread[]> {
        return await db.chatThreads
            .where('projectId')
            .equals(projectId)
            .filter(t => !t.archived)
            .reverse()
            .sortBy('updatedAt');
    }

    async createThread(thread: Partial<ChatThread> & { projectId: string; name: string }): Promise<ChatThread> {
        const newThread: ChatThread = {
            id: crypto.randomUUID(),
            pinned: false,
            archived: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...thread,
        };

        await db.chatThreads.add(newThread);
        return newThread;
    }

    async updateThread(id: string, data: Partial<ChatThread>): Promise<void> {
        await db.chatThreads.update(id, {
            ...data,
            updatedAt: Date.now(),
        });
    }

    async deleteThread(id: string): Promise<void> {
        // Delete all messages in the thread first
        const messages = await db.chatMessages.where('threadId').equals(id).toArray();
        await db.chatMessages.bulkDelete(messages.map(m => m.id));

        // Delete the thread
        await db.chatThreads.delete(id);
    }

    // Message operations
    async getMessage(id: string): Promise<ChatMessage | undefined> {
        return await db.chatMessages.get(id);
    }

    async getMessagesByThread(threadId: string): Promise<ChatMessage[]> {
        return await db.chatMessages
            .where('threadId')
            .equals(threadId)
            .sortBy('timestamp');
    }

    async createMessage(message: Partial<ChatMessage> & { threadId: string; role: 'user' | 'assistant'; content: string }): Promise<ChatMessage> {
        const newMessage: ChatMessage = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            ...message,
        };

        await db.chatMessages.add(newMessage);
        return newMessage;
    }

    async updateMessage(id: string, data: Partial<ChatMessage>): Promise<void> {
        await db.chatMessages.update(id, data);
    }

    async deleteMessage(id: string): Promise<void> {
        await db.chatMessages.delete(id);
    }

    async bulkDeleteMessages(ids: string[]): Promise<void> {
        await db.chatMessages.bulkDelete(ids);
    }
}
