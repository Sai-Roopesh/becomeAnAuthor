import type { ChatContext, ChatMessage } from '@/domain/entities/types';

/**
 * Chat Settings for AI generation
 */
export interface ChatSettings {
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
}

/**
 * Parameters for generating AI response
 */
export interface GenerateResponseParams {
    message: string;
    threadId: string;
    projectId: string;
    context?: ChatContext;
    model: string;
    settings: ChatSettings;
    promptId: string;
}

/**
 * Chat Service Interface
 * Handles AI interactions and conversation management
 */
export interface IChatService {
    /**
     * Generate AI response with context
     * Handles conversation history, context building, and AI generation
     */
    generateResponse(params: GenerateResponseParams): Promise<{
        responseText: string;
        model: string;
    }>;

    /**
     * Build context text from novel/codex selections
     * Fetches and formats selected content for AI context
     */
    buildContextText(
        context: ChatContext,
        projectId: string
    ): Promise<string>;

    /**
     * Get conversation history for a thread
     * Optionally filtered by timestamp
     */
    getConversationHistory(
        threadId: string,
        beforeTimestamp?: number
    ): Promise<ChatMessage[]>;
}
