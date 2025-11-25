import { db } from '@/lib/core/database';
import { CodexEntry } from '@/lib/config/types';

// Helper to yield to main thread to prevent blocking UI
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

// Common English words that require case-sensitive matching to avoid false positives
const COMMON_WORDS = new Set([
    'will', 'may', 'mark', 'bill', 'grace', 'hope', 'faith', 'joy',
    'charity', 'rose', 'iris', 'lily', 'jasmine', 'angel', 'summer',
    'autumn', 'winter', 'spring', 'sage', 'hunter', 'archer', 'mason',
    'taylor', 'baker', 'cooper', 'turner', 'page', 'penny'
]);

// Helper to escape regex special characters
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if a codex entry is relevant to the given text
function isRelevantEntity(entry: CodexEntry, text: string): boolean {
    if (entry.settings?.isGlobal) return true;

    const names = [entry.name, ...(entry.aliases || [])];

    return names.some(name => {
        const lowerName = name.toLowerCase();

        // For common words, require exact case match with word boundaries
        if (COMMON_WORDS.has(lowerName)) {
            const regex = new RegExp(`\\b${escapeRegex(name)}\\b`);
            return regex.test(text); // Case-sensitive
        }

        // For uncommon names, use word boundary but case-insensitive
        const regex = new RegExp(`\\b${escapeRegex(lowerName)}\\b`, 'i');
        return regex.test(text);
    });
}

export async function assembleContext(sceneId: string | null, query: string): Promise<string> {
    let context = '';
    let relevantEntities: CodexEntry[] = [];

    // 1. Get Active Scene Content
    if (sceneId) {
        const scene = await db.nodes.get(sceneId);
        if (scene && scene.type === 'scene') {
            // Extract text from Tiptap JSON (Async & Non-blocking)
            const sceneText = await extractTextFromTiptap(scene.content);
            context += `CURRENT SCENE:\n${sceneText}\n\n`;

            // 2. Detect Entities in Scene + Query using smart matching
            const allCodex = await db.codex.where('projectId').equals(scene.projectId).toArray();
            const combinedText = sceneText + ' ' + query;

            relevantEntities = allCodex.filter(entry => isRelevantEntity(entry, combinedText));
        }
    }

    // 3. Format Codex Entries
    if (relevantEntities.length > 0) {
        context += `STORY CONTEXT (CODEX):\n`;
        relevantEntities.forEach(e => {
            context += `- ${e.name} (${e.category}): ${e.description}\n`;
        });
        context += `\n`;
    }

    return context;
}

// Async recursive function with yielding
async function extractTextFromTiptap(content: any): Promise<string> {
    if (!content) return '';
    if (typeof content === 'string') return content;

    // Yield every now and then if processing large arrays
    if (Array.isArray(content)) {
        if (content.length > 50) await yieldToMain();
        const parts = await Promise.all(content.map(extractTextFromTiptap));
        return parts.join(' ');
    }

    if (content.text) return content.text;
    if (content.content) return extractTextFromTiptap(content.content);

    return '';
}
