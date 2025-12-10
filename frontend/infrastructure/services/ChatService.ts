import type {
    IChatService,
    GenerateResponseParams,
    ChatSettings
} from '@/domain/services/IChatService';
import type {
    ChatContext,
    ChatMessage,
    Scene,
    CodexEntry,
    Act,
    Chapter
} from '@/lib/config/types';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { IChatRepository } from '@/domain/repositories/IChatRepository';
import { generateText } from '@/lib/core/ai-client';
import { getPromptTemplate } from '@/shared/prompts/templates';
import { extractTextFromContent } from '@/shared/utils/editor';
import { aiRateLimiter } from '@/lib/integrations/ai-rate-limiter';
import { toast } from '@/shared/utils/toast-service';

/**
 * Chat Service with AI Rate Limiting
 * Handles AI interactions using repositories
 */
export class ChatService implements IChatService {
    constructor(
        private nodeRepository: INodeRepository,
        private codexRepository: ICodexRepository,
        private chatRepository: IChatRepository
    ) {
        // Set up rate limiter callbacks
        aiRateLimiter.setWarningCallback((usage, limit, period) => {
            toast.warning(`AI rate limit warning: ${usage}/${limit} requests this ${period}`, {
                description: 'Slow down to avoid being blocked'
            });
        });

        aiRateLimiter.setBlockedCallback((retryAfterMs) => {
            const seconds = Math.ceil(retryAfterMs / 1000);
            toast.error(`Rate limit exceeded. Try again in ${seconds} seconds.`);
        });
    }

    /**
     * Generate AI response with full context and conversation history
     */
    async generateResponse(params: GenerateResponseParams): Promise<{
        responseText: string;
        model: string;
    }> {
        const { message, threadId, projectId, context, model, settings, promptId } = params;

        // ✅ SEC-3: Check rate limit before making AI request
        const rateLimitCheck = aiRateLimiter.canMakeRequest();
        if (!rateLimitCheck.allowed) {
            throw new Error(rateLimitCheck.reason || 'Rate limit exceeded');
        }

        // 1. Build context text if provided
        let contextText = '';
        if (context) {
            contextText = await this.buildContextText(context, projectId);
        }

        // 2. Get prompt template
        const template = getPromptTemplate(promptId);

        // 3. Build system prompt with context
        let systemPrompt = template.systemPrompt;
        if (contextText) {
            systemPrompt += `\n\n=== CONTEXT ===\n${contextText}`;
        }

        // 4. Get conversation history
        const allMessages = await this.chatRepository.getMessagesByThread(threadId);

        // Build conversation history string (exclude current message if it exists)
        const conversationHistory = allMessages
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n\n');

        // 5. Build full prompt with history
        const fullPrompt = conversationHistory
            ? `Previous conversation:\n${conversationHistory}\n\nUser: ${message}`
            : message;

        // 6. Generate AI response
        const response = await generateText({
            model,
            system: systemPrompt,
            prompt: fullPrompt,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
        });

        // ✅ Record successful request for rate limiting
        aiRateLimiter.recordRequest();

        return {
            responseText: response.text,
            model,
        };
    }

    /**
     * Build context text from novel/codex selections
     */
    async buildContextText(
        context: ChatContext,
        projectId: string
    ): Promise<string> {
        if (!projectId) return '';
        const parts: string[] = [];

        // 1. Full Novel Text
        if (context.novelText === 'full') {
            const allScenes = await this.nodeRepository.getByProject(projectId);
            const scenes = allScenes.filter(n => n.type === 'scene') as Scene[];

            const fullText = scenes.map(s => {
                return `[Scene: ${s.title}]\n${extractTextFromContent(s.content)}`;
            }).join('\n\n');

            parts.push(`=== FULL NOVEL TEXT ===\n${fullText}`);
        }

        // 2. Outline
        if (context.novelText === 'outline') {
            const nodes = await this.nodeRepository.getByProject(projectId);

            const outline = nodes.map(n => {
                const indent = n.type === 'act' ? '' : n.type === 'chapter' ? '  ' : '    ';
                let info = `${indent}- [${n.type.toUpperCase()}] ${n.title}`;
                if (n.type === 'scene') {
                    const scene = n as Scene;
                    if (scene.summary) info += `\n${indent}  Summary: ${scene.summary}`;
                }
                return info;
            }).join('\n');

            parts.push(`=== NOVEL OUTLINE ===\n${outline}`);
        }

        // 3. Specific Acts
        if (context.acts && context.acts.length > 0) {
            for (const actId of context.acts) {
                const act = await this.nodeRepository.get(actId) as Act | undefined;
                if (act) {
                    const chapters = await this.nodeRepository.getChildren(actId);
                    const chapterIds = chapters.map(c => c.id);

                    const allScenes = await this.nodeRepository.getByProject(projectId);
                    const scenes = allScenes.filter(n =>
                        n.type === 'scene' && chapterIds.includes(n.parentId || '')
                    ) as Scene[];

                    const actText = scenes.map(s => {
                        return `[Scene: ${s.title}]\n${extractTextFromContent(s.content)}`;
                    }).join('\n\n');

                    parts.push(`=== ACT: ${act.title} ===\n${actText}`);
                }
            }
        }

        // 4. Specific Chapters
        if (context.chapters && context.chapters.length > 0) {
            for (const chapterId of context.chapters) {
                const chapter = await this.nodeRepository.get(chapterId) as Chapter | undefined;
                if (chapter) {
                    const scenes = await this.nodeRepository.getChildren(chapterId) as Scene[];

                    const chapterText = scenes.map(s => {
                        return `[Scene: ${s.title}]\n${extractTextFromContent(s.content)}`;
                    }).join('\n\n');

                    parts.push(`=== CHAPTER: ${chapter.title} ===\n${chapterText}`);
                }
            }
        }

        // 5. Specific Scenes
        if (context.scenes && context.scenes.length > 0) {
            for (const sceneId of context.scenes) {
                const scene = await this.nodeRepository.get(sceneId) as Scene | undefined;
                if (scene) {
                    parts.push(`=== SCENE: ${scene.title} ===\n${extractTextFromContent(scene.content)}`);
                }
            }
        }

        // 6. Codex Entries
        if (context.codexEntries && context.codexEntries.length > 0) {
            const entries = await Promise.all(
                context.codexEntries.map(id => this.codexRepository.get(id))
            );
            const validEntries = entries.filter(e => e !== undefined) as CodexEntry[];

            const codexText = validEntries.map(e =>
                `[Codex: ${e.name} (${e.category})]\n${e.description}\n${e.notes ? `Notes: ${e.notes}` : ''}`
            ).join('\n\n');

            if (codexText) {
                parts.push(`=== CODEX ENTRIES ===\n${codexText}`);
            }
        }

        return parts.join('\n\n');
    }

    /**
     * Get conversation history for a thread
     */
    async getConversationHistory(
        threadId: string,
        beforeTimestamp?: number
    ): Promise<ChatMessage[]> {
        const allMessages = await this.chatRepository.getMessagesByThread(threadId);

        if (beforeTimestamp) {
            return allMessages.filter(m => m.timestamp < beforeTimestamp);
        }

        return allMessages;
    }
}
