/**
 * AI Context Assembler
 * Manages context for AI chat to prevent token limit issues
 * Implements smart truncation and token estimation
 */

import type { TiptapContent, TiptapNode } from '@/shared/types/tiptap';
import { isElementNode } from '@/shared/types/tiptap';
import { getModelSpec } from '@/lib/config/model-specs';

/** Minimum tokens threshold for including high-priority truncated items */
const MIN_HIGH_PRIORITY_TOKENS = 500;

export interface ContextItem {
    type: 'scene' | 'codex' | 'system';
    id: string;
    content: string;
    tokens: number;
    priority: number;
}


export class ContextAssembler {
    /**
     * Estimate token count for text
     * Uses rough estimation: 1 token ≈ 4 characters for English
     */
    estimateTokens(text: string): number {
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
        const modelSpec = getModelSpec(modelKey ?? 'gpt-3.5-turbo');
        const maxContextTokens = modelSpec.maxInputTokens - modelSpec.maxOutputTokens;


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
            } else if (availableTokens > MIN_HIGH_PRIORITY_TOKENS && item.priority >= 7) {
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
            warningMessage = `Context limited to ${totalTokens.toLocaleString()} tokens. ${skipped} items excluded to fit within model limits.`;
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
        content: TiptapContent | null | undefined;
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
        description?: string;
        category: string;
    }, priority: number = 6): ContextItem {
        const fullContent = `${entry.category}: ${entry.name}\n\n${entry.description || ''}`;

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
    private extractTextFromTiptap(content: TiptapContent | null | undefined): string {
        if (!content || !content.content) {
            return '';
        }

        let text = '';

        const processNode = (node: TiptapNode): void => {
            if (node.type === 'text') {
                text += node.text || '';
            } else if (isElementNode(node) && node.content && Array.isArray(node.content)) {
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

// Lazy singleton for SSR safety
let _contextAssembler: ContextAssembler | null = null;

/**
 * Get the ContextAssembler singleton instance
 * Uses lazy initialization for SSR safety
 */
export function getContextAssembler(): ContextAssembler {
    if (!_contextAssembler) {
        _contextAssembler = new ContextAssembler();
    }
    return _contextAssembler;
}

