
export function extractTextFromContent(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;

    if (Array.isArray(content)) {
        return content.map(extractTextFromContent).join('\n');
    }

    if (content.type === 'text') {
        return content.text || '';
    }

    if (content.content) {
        return extractTextFromContent(content.content);
    }

    return '';
}

/**
 * Extract plain text from Tiptap JSON content
 * Used in: scene summarization, export, copy prose
 */
export function extractTextFromTiptapJSON(content: any): string {
    if (!content?.content) return '';

    return content.content
        .map((node: any) => {
            if (node.type === 'paragraph' && node.content) {
                return node.content.map((c: any) => c.text || '').join('');
            }
            if (node.type === 'heading' && node.content) {
                return node.content.map((c: any) => c.text || '').join('');
            }
            return '';
        })
        .filter((text: string) => text.length > 0)
        .join('\n\n');
}
