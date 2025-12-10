import { invoke } from '@tauri-apps/api/core';
import { getCurrentProjectPath } from '@/infrastructure/repositories/TauriNodeRepository';
import type { CodexEntry, Scene } from '@/lib/config/types';

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

    const projectPath = getCurrentProjectPath();
    if (!projectPath) return context;

    // 1. Get Active Scene Content
    if (sceneId) {
        try {
            const sceneContent = await invoke<string>('load_scene', {
                projectPath,
                sceneId
            });

            // Extract text from content
            const sceneText = await extractTextFromTiptap(JSON.parse(sceneContent || '{}'));
            context += `CURRENT SCENE:\n${sceneText}\n\n`;

            // 2. Detect Entities in Scene + Query using smart matching
            const allCodex = await invoke<CodexEntry[]>('list_codex_entries', { projectPath });
            const combinedText = sceneText + ' ' + query;

            relevantEntities = allCodex.filter(entry => isRelevantEntity(entry, combinedText));
        } catch (error) {
            console.error('Failed to load scene for context:', error);
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

// ✅ SAFE: Async recursive function with yielding AND depth limit
async function extractTextFromTiptap(content: any, depth: number = 0): Promise<string> {
    const MAX_DEPTH = 100;

    // Prevent stack overflow from malicious deeply nested structures
    if (depth > MAX_DEPTH) {
        console.warn('Max recursion depth reached in extractTextFromTiptap');
        return '';
    }

    if (!content) return '';
    if (typeof content === 'string') return content;

    // Yield every now and then if processing large arrays
    if (Array.isArray(content)) {
        if (content.length > 50) await yieldToMain();
        const parts = await Promise.all(content.map(item => extractTextFromTiptap(item, depth + 1)));
        return parts.join(' ');
    }

    if (content.text) return content.text;
    if (content.content) return extractTextFromTiptap(content.content, depth + 1);

    return '';
}
