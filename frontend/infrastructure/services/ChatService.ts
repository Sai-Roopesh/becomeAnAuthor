import type { IChatService, GenerateResponseParams } from '@/domain/services/IChatService';
import type { ChatContext, ChatMessage } from '@/domain/entities/types';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { IChatRepository } from '@/domain/repositories/IChatRepository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import { generate } from '@/lib/ai';

/**
 * Chat Service Implementation
 * Provides AI generation using the new unified AI SDK client
 */
export class ChatService implements IChatService {
    constructor(
        private nodeRepository: INodeRepository,
        private codexRepository: ICodexRepository,
        private chatRepository: IChatRepository,
        private projectRepository: IProjectRepository
    ) { }

    async generateResponse(params: GenerateResponseParams): Promise<{ responseText: string; model: string }> {
        const context = params.context ? await this.buildContextText(params.context, params.projectId) : '';
        const systemPrompt = context ? `Context:\n${context}` : undefined;

        const result = await generate({
            model: params.model,
            prompt: params.message,
            ...(systemPrompt && { system: systemPrompt }),
            ...(params.settings.maxTokens && { maxTokens: params.settings.maxTokens }),
            ...(params.settings.temperature != null && { temperature: params.settings.temperature }),
        });

        return {
            responseText: result.text,
            model: params.model,
        };
    }

    async buildContextText(context: ChatContext, projectId: string): Promise<string> {
        const parts: string[] = [];

        // Add scene content if selected
        if (context.scenes?.length) {
            const allNodes = await this.nodeRepository.getByProject(projectId);
            for (const sceneId of context.scenes) {
                const node = allNodes.find((n) => n.id === sceneId);
                if (node && node.type === 'scene') {
                    parts.push(`[Scene: ${node.title}]\n${JSON.stringify((node as { content: unknown }).content)}`);
                }
            }
        }

        // Add codex entries if selected (need to get seriesId from project)
        if (context.codexEntries?.length) {
            const project = await this.projectRepository.get(projectId);
            if (project?.seriesId) {
                const allEntries = await this.codexRepository.getBySeries(project.seriesId);
                for (const entryId of context.codexEntries) {
                    const entry = allEntries.find((e) => e.id === entryId);
                    if (entry?.description) {
                        parts.push(`[${entry.category}: ${entry.name}]\n${entry.description}`);
                    }
                }
            }
        }

        return parts.join('\n\n');
    }

    async getConversationHistory(threadId: string, beforeTimestamp?: number): Promise<ChatMessage[]> {
        // Get messages for the thread from repository
        const messages = await this.chatRepository.getMessagesByThread(threadId);

        if (beforeTimestamp) {
            return messages.filter((m: ChatMessage) => m.timestamp < beforeTimestamp);
        }

        return messages;
    }
}
