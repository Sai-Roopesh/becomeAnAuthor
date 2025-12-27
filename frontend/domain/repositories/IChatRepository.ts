import type { ChatThread, ChatMessage } from '@/domain/entities/types';

/**
 * Repository interface for Chat threads and messages
 * Decouples business logic from Dexie implementation
 */
export interface IChatRepository {
    /**
     * Get a single thread by ID
     */
    getThread(id: string): Promise<ChatThread | undefined>;

    /**
     * Get all threads for a project
     */
    getThreadsByProject(projectId: string): Promise<ChatThread[]>;

    /**
     * Get non-archived threads for a project, sorted by updatedAt
     */
    getActiveThreads(projectId: string): Promise<ChatThread[]>;

    /**
     * Create a new chat thread
     */
    createThread(thread: Partial<ChatThread> & { projectId: string; name: string }): Promise<ChatThread>;

    /**
     * Update a thread
     */
    updateThread(id: string, data: Partial<ChatThread>): Promise<void>;

    /**
     * Delete a thread (should cascade delete messages)
     */
    deleteThread(id: string): Promise<void>;

    /**
     * Get a single message by ID
     */
    getMessage(id: string): Promise<ChatMessage | undefined>;

    /**
     * Get all messages for a thread, sorted by timestamp
     */
    getMessagesByThread(threadId: string): Promise<ChatMessage[]>;

    /**
     * Create a new message
     */
    createMessage(message: Partial<ChatMessage> & { threadId: string; role: 'user' | 'assistant'; content: string }): Promise<ChatMessage>;

    /**
     * Update a message
     */
    updateMessage(id: string, data: Partial<ChatMessage>): Promise<void>;

    /**
     * Delete a message
     */
    deleteMessage(id: string): Promise<void>;

    /**
     * Bulk delete messages
     */
    bulkDeleteMessages(ids: string[]): Promise<void>;
}
