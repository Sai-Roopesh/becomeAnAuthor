import { invoke } from '@tauri-apps/api/core';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';
import type { CodexEntry } from '@/domain/entities/types';

// Helper to yield to main thread to prevent blocking UI
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

// =============================================================================
// @MENTION EXTRACTION
// =============================================================================

/**
 * Extract all @mention codex IDs from Tiptap JSON content
 * Scans for nodes with type: "mention" and extracts their codex entry IDs
 */
function extractMentionIds(content: unknown): string[] {
    const ids: string[] = [];

    function traverse(node: unknown) {
        if (!node || typeof node !== 'object') return;

        if (Array.isArray(node)) {
            node.forEach(traverse);
            return;
        }

        const obj = node as Record<string, unknown>;

        // Found a mention node
        if (obj['type'] === 'mention' && obj['attrs']) {
            const attrs = obj['attrs'] as Record<string, unknown>;
            if (typeof attrs['id'] === 'string') {
                ids.push(attrs['id']);
            }
        }

        // Recurse into content
        if (obj['content']) traverse(obj['content']);
    }

    traverse(content);
    return [...new Set(ids)]; // Deduplicate
}

// =============================================================================
// RICH CODEX FORMATTING
// =============================================================================

/**
 * Format a codex entry with full details for AI context
 * Includes: name, description, attributes, aliases, core description
 */
function formatCodexEntry(entry: CodexEntry): string {
    const lines: string[] = [];

    // Header with name and category
    lines.push(`### ${entry.name} (${entry.category.toUpperCase()})`);

    // Main description
    if (entry.description) {
        lines.push(entry.description);
    }

    // Include all attributes (age, occupation, appearance, etc.)
    if (entry.attributes && Object.keys(entry.attributes).length > 0) {
        lines.push('**Attributes:**');
        Object.entries(entry.attributes).forEach(([key, value]) => {
            if (value) {
                lines.push(`- ${key}: ${value}`);
            }
        });
    }

    // Include aliases so AI recognizes alternate names
    if (entry.aliases && entry.aliases.length > 0) {
        lines.push(`**Also known as:** ${entry.aliases.join(', ')}`);
    }

    // Include AI-specific concise summary if available
    if (entry.coreDescription) {
        lines.push(`**Key traits:** ${entry.coreDescription}`);
    }

    return lines.join('\n') + '\n';
}

/**
 * Group entries by category
 */
function groupByCategory(entries: CodexEntry[]): Record<string, CodexEntry[]> {
    return entries.reduce((acc, entry) => {
        const cat = entry.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(entry);
        return acc;
    }, {} as Record<string, CodexEntry[]>);
}

// =============================================================================
// MAIN CONTEXT ASSEMBLY
// =============================================================================

/**
 * Assemble AI context from current scene and @mentioned codex entries
 * 
 * @param sceneId - Current scene ID
 * @param query - User's query/instruction
 * @param seriesId - Series ID for series-level codex lookups (optional)
 */
export async function assembleContext(
    sceneId: string | null,
    query: string,
    seriesId?: string
): Promise<string> {
    let context = '';
    const projectPath = TauriNodeRepository.getInstance().getProjectPath();
    if (!projectPath) return context;

    if (sceneId) {
        try {
            // Load scene content - Tauri expects sceneFile (snake_case in Rust becomes camelCase)
            const sceneContent = await invoke<string>('load_scene', {
                projectPath,
                sceneFile: sceneId  // Backend expects scene_file, Tauri converts to sceneFile
            });

            const sceneJson = JSON.parse(sceneContent || '{}');
            const sceneText = await extractTextFromTiptap(sceneJson);

            // Extract @mentioned codex entry IDs from scene content
            const mentionedIds = extractMentionIds(sceneJson);

            // Get codex entries for @mentions
            let mentionedEntries: CodexEntry[] = [];

            if (mentionedIds.length > 0) {
                try {
                    // Try series-level codex first (preferred)
                    if (seriesId) {
                        const allCodex = await invoke<CodexEntry[]>(
                            'list_series_codex_entries',
                            { seriesId }
                        );
                        mentionedEntries = allCodex.filter(e => mentionedIds.includes(e.id));
                    } else {
                        // Fallback to project-level codex
                        const allCodex = await invoke<CodexEntry[]>(
                            'list_codex_entries',
                            { projectPath }
                        );
                        mentionedEntries = allCodex.filter(e => mentionedIds.includes(e.id));
                    }
                } catch (error) {
                    console.warn('Failed to load codex entries for mentions:', error);
                }
            }

            // Build context with codex entries FIRST (so AI knows the context)
            if (mentionedEntries.length > 0) {
                context += `## STORY BIBLE (Referenced in Scene)\n`;
                context += `The following entries are @mentioned. Maintain consistency with their details:\n\n`;

                const byCategory = groupByCategory(mentionedEntries);

                // Characters first (most important for consistency)
                if (byCategory['character']?.length) {
                    context += `### CHARACTERS\n`;
                    byCategory['character'].forEach(e => {
                        context += formatCodexEntry(e);
                    });
                    context += '\n';
                }

                // Locations
                if (byCategory['location']?.length) {
                    context += `### LOCATIONS\n`;
                    byCategory['location'].forEach(e => {
                        context += formatCodexEntry(e);
                    });
                    context += '\n';
                }

                // Items
                if (byCategory['item']?.length) {
                    context += `### ITEMS\n`;
                    byCategory['item'].forEach(e => {
                        context += formatCodexEntry(e);
                    });
                    context += '\n';
                }

                // Lore/World Rules
                if (byCategory['lore']?.length) {
                    context += `### LORE & WORLD RULES\n`;
                    byCategory['lore'].forEach(e => {
                        context += formatCodexEntry(e);
                    });
                    context += '\n';
                }

                // Subplots
                if (byCategory['subplot']?.length) {
                    context += `### SUBPLOTS\n`;
                    byCategory['subplot'].forEach(e => {
                        context += formatCodexEntry(e);
                    });
                    context += '\n';
                }
            }

            // Add scene content AFTER codex (so AI has context first)
            context += `## CURRENT SCENE\n${sceneText}\n\n`;

        } catch (error) {
            console.error('Failed to load scene for context:', error);
        }
    }

    return context;
}

// =============================================================================
// TEXT EXTRACTION
// =============================================================================

/**
 * Extract plain text from Tiptap JSON content
 * Safe async recursive function with depth limit
 */
async function extractTextFromTiptap(content: unknown, depth: number = 0): Promise<string> {
    const MAX_DEPTH = 100;

    // Prevent stack overflow from deeply nested structures
    if (depth > MAX_DEPTH) {
        console.warn('Max recursion depth reached in extractTextFromTiptap');
        return '';
    }

    if (!content) return '';
    if (typeof content === 'string') return content;

    // Yield every now and then if processing large arrays
    if (Array.isArray(content)) {
        if (content.length > 50) await yieldToMain();
        const parts = await Promise.all(
            content.map((item: unknown) => extractTextFromTiptap(item, depth + 1))
        );
        return parts.join(' ');
    }

    // Handle object with text or content properties
    if (typeof content === 'object' && content !== null) {
        const obj = content as Record<string, unknown>;

        // Handle mention nodes - include the label text
        if (obj['type'] === 'mention' && obj['attrs']) {
            const attrs = obj['attrs'] as Record<string, unknown>;
            return typeof attrs['label'] === 'string' ? attrs['label'] : '';
        }

        if (typeof obj['text'] === 'string') return obj['text'];
        if (obj['content']) return extractTextFromTiptap(obj['content'], depth + 1);
    }

    return '';
}

