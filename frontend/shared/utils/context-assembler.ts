/**
 * AI Context Assembler
 * Manages context for AI chat to prevent token limit issues
 * Implements smart truncation and token estimation
 */

import { countTokens } from './token-counter';

export interface ContextItem {
    type: 'scene' | 'codex' | 'system';
    id: string;
    content: string;
    tokens: number;
    priority: number;
}

export interface ModelConfig {
    name: string;
    maxTokens: number;
    responseTokens: number; // Reserve for response
}

// Common AI model configurations
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
    'gpt-4': { name: 'GPT-4', maxTokens: 8192, responseTokens: 2000 },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', maxTokens: 128000, responseTokens: 4000 },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', maxTokens: 16385, responseTokens: 2000 },
    'claude-3-opus': { name: 'Claude 3 Opus', maxTokens: 200000, responseTokens: 4000 },
    'claude-3-sonnet': { name: 'Claude 3 Sonnet', maxTokens: 200000, responseTokens: 4000 },
    'claude-3-haiku': { name: 'Claude 3 Haiku', maxTokens: 200000, responseTokens: 4000 },
    'gemini-pro': { name: 'Gemini Pro', maxTokens: 32768, responseTokens: 2000 },
};

export class ContextAssembler {
    /**
     * Estimate token count for text
     * Uses tiktoken for accurate counting, falls back to estimation if needed
     */
    estimateTokens(text: string, model?: string): number {
        if (model) {
            // Use accurate token counting with tiktoken
            return countTokens(text, model);
        }
        // Fallback to rough estimate: 1 token ≈ 4 characters for English
        return Math.ceil(text.length / 4);
    }

    /**
     * Assemble context within token limits
     * Prioritizes items and truncates as needed
     */
    assembleContext(
        items: ContextItem[],
        modelKey: string,
        systemPrompt: string
    ): {
        context: ContextItem[];
        truncated: boolean;
        totalTokens: number;
        warningMessage?: string;
    } {
        const modelConfig = MODEL_CONFIGS[modelKey ?? 'gpt-3.5-turbo'] || MODEL_CONFIGS['gpt-3.5-turbo'];
        const maxContextTokens = modelConfig!.maxTokens - modelConfig!.responseTokens;

        // System prompt always included
        const systemTokens = this.estimateTokens(systemPrompt);
        let availableTokens = maxContextTokens - systemTokens;

        // Sort by priority (higher first)
        const sortedItems = [...items].sort((a, b) => b.priority - a.priority);

        const includedItems: ContextItem[] = [];
        let totalTokens = systemTokens;
        let truncated = false;

        for (const item of sortedItems) {
            if (availableTokens >= item.tokens) {
                // Include full item
                includedItems.push(item);
                availableTokens -= item.tokens;
                totalTokens += item.tokens;
            } else if (availableTokens > 500 && item.priority >= 7) {
                // High priority item - truncate to fit
                const truncatedContent = this.truncateText(item.content, availableTokens);
                const truncatedItem: ContextItem = {
                    ...item,
                    content: truncatedContent,
                    tokens: availableTokens,
                };
                includedItems.push(truncatedItem);
                totalTokens += availableTokens;
                availableTokens = 0;
                truncated = true;
                break;
            } else {
                // Can't fit - skip
                truncated = true;
                break;
            }
        }

        let warningMessage: string | undefined;
        if (truncated) {
            const skipped = sortedItems.length - includedItems.length;
            warningMessage = `Context limited to ${totalTokens.toLocaleString()} tokens. ${skipped} items excluded to fit within ${modelConfig!.name} limits.`;
        }

        return {
            context: includedItems,
            truncated,
            totalTokens,
            ...(warningMessage && { warningMessage }),
        };
    }

    /**
     * Truncate text to approximate token count
     */
    private truncateText(text: string, targetTokens: number): string {
        const targetChars = targetTokens * 4; // Rough conversion
        if (text.length <= targetChars) {
            return text;
        }

        // Truncate at word boundary
        let truncated = text.substring(0, targetChars);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > targetChars * 0.8) {
            truncated = truncated.substring(0, lastSpace);
        }

        return truncated;
    }

    /**
     * Create context item from scene
     */
    createSceneContext(scene: {
        id: string;
        title: string;
        content: any;
    }, priority: number = 5): ContextItem {
        // Extract text from Tiptap JSON
        const text = this.extractTextFromTiptap(scene.content);
        const fullContent = `Scene: ${scene.title}\n\n${text}`;

        return {
            type: 'scene',
            id: scene.id,
            content: fullContent,
            tokens: this.estimateTokens(fullContent),
            priority,
        };
    }

    /**
     * Create context item from codex entry
     */
    createCodexContext(entry: {
        id: string;
        name: string;
        description: string;
        category: string;
    }, priority: number = 6): ContextItem {
        const fullContent = `${entry.category}: ${entry.name}\n\n${entry.description}`;

        return {
            type: 'codex',
            id: entry.id,
            content: fullContent,
            tokens: this.estimateTokens(fullContent),
            priority,
        };
    }

    /**
     * Extract plain text from Tiptap JSON content
     */
    private extractTextFromTiptap(content: any): string {
        if (!content || !content.content) {
            return '';
        }

        let text = '';

        const processNode = (node: any): void => {
            if (node.type === 'text') {
                text += node.text || '';
            } else if (node.content && Array.isArray(node.content)) {
                for (const child of node.content) {
                    processNode(child);
                }
                // Add newline after paragraphs
                if (node.type === 'paragraph' || node.type === 'heading') {
                    text += '\n';
                }
            }
        };

        if (Array.isArray(content.content)) {
            for (const node of content.content) {
                processNode(node);
            }
        }

        return text.trim();
    }
}

// Singleton instance
export const contextAssembler = new ContextAssembler();
