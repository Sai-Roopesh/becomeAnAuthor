
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
