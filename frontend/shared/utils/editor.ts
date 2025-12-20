/**
 * Tiptap Editor Utilities
 * Functions for extracting and manipulating Tiptap editor content
 */

import type { TiptapContent, TiptapNode } from '@/shared/types/tiptap';

/**
 * Extract plain text from Tiptap content (recursive)
 */
export function extractTextFromContent(content: TiptapContent | TiptapNode | null | undefined): string {
    if (!content) return '';

    // Handle text nodes
    if ('text' in content && typeof content.text === 'string') {
        return content.text;
    }

    // Handle nodes with content array
    if ('content' in content && Array.isArray(content.content)) {
        return content.content
            .map(node => extractTextFromContent(node))
            .join('');
    }

    return '';
}

/**
 * Extract plain text from Tiptap JSON (alias for better naming)
 * Used in: scene summarization, export, copy prose
 */
export function extractTextFromTiptapJSON(content: TiptapContent | null | undefined): string {
    if (!content?.content) return '';

    return content.content
        .map((node) => {
            if ('type' in node && (node.type === 'paragraph' || node.type === 'heading')) {
                if ('content' in node && Array.isArray(node.content)) {
                    return node.content
                        .map(c => ('text' in c ? c.text || '' : ''))
                        .join('');
                }
            }
            return '';
        })
        .filter((text) => text.length > 0)
        .join('\n\n');
}

/**
 * Count words in Tiptap JSON content
 */
export function countWordsInTiptapJSON(json: TiptapContent | null | undefined): number {
    const text = extractTextFromTiptapJSON(json);

    // Remove extra whitespace and split by whitespace
    const words = text
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(word => word.length > 0);

    return words.length;
}
