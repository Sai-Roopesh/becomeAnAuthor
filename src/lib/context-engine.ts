import { db } from './db';
import { CodexEntry } from './types';

export async function assembleContext(sceneId: string | null, query: string): Promise<string> {
    let context = '';
    let relevantEntities: CodexEntry[] = [];

    // 1. Get Active Scene Content
    if (sceneId) {
        const scene = await db.nodes.get(sceneId);
        if (scene && scene.type === 'scene') {
            // Extract text from Tiptap JSON (simplified)
            const sceneText = extractTextFromTiptap(scene.content);
            context += `CURRENT SCENE:\n${sceneText}\n\n`;

            // 2. Detect Entities in Scene + Query
            const allCodex = await db.codex.where('projectId').equals(scene.projectId).toArray();
            const combinedText = (sceneText + ' ' + query).toLowerCase();

            relevantEntities = allCodex.filter(entry => {
                if (entry.settings.isGlobal) return true;
                const names = [entry.name, ...entry.aliases].map(n => n.toLowerCase());
                return names.some(n => combinedText.includes(n));
            });
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

function extractTextFromTiptap(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(extractTextFromTiptap).join(' ');
    if (content.text) return content.text;
    if (content.content) return extractTextFromTiptap(content.content);
    return '';
}
