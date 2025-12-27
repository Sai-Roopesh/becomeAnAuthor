'use client';

import { useCallback } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { SceneCodexLinkRole } from '@/domain/entities/types';
import type { TiptapContent, TiptapNode } from '@/shared/types/tiptap';

interface MentionData {
    id: string;
    name: string;
    category?: string;
}

// Type for mention node attributes
interface MentionAttrs {
    id: string;
    label?: string;
    category?: string;
}

/**
 * Hook for auto-linking @mentions in scene content to SceneCodexLinks
 * Extracts mention nodes from Tiptap JSON and creates persistent links
 */
export function useAutoLinkMentions() {
    const { sceneCodexLinkRepository: linkRepo, codexRepository: codexRepo } = useAppServices();

    /**
     * Extract all mention nodes from Tiptap JSON content
     */
    const extractMentions = useCallback((content: TiptapContent | null | undefined): MentionData[] => {
        const mentions: MentionData[] = [];

        const traverse = (node: TiptapNode | TiptapContent | null | undefined): void => {
            if (!node) return;

            // Check if this is a mention node
            if (node.type === 'mention') {
                const attrs = node.attrs as MentionAttrs | undefined;
                if (attrs?.id) {
                    mentions.push({
                        id: attrs.id,
                        name: attrs.label || attrs.id,
                        ...(attrs.category && { category: attrs.category }),
                    });
                }
            }

            // Recursively traverse content
            if ('content' in node && Array.isArray(node.content)) {
                node.content.forEach(traverse);
            }
        };

        traverse(content);

        // Remove duplicates by id
        const uniqueMentions = mentions.reduce((acc, mention) => {
            if (!acc.find(m => m.id === mention.id)) {
                acc.push(mention);
            }
            return acc;
        }, [] as MentionData[]);

        return uniqueMentions;
    }, []);

    /**
     * Get the appropriate role based on codex category
     */
    const getRoleForCategory = (category?: string): SceneCodexLinkRole => {
        switch (category) {
            case 'character': return 'mentioned';
            case 'location': return 'location';
            case 'subplot': return 'plot';
            default: return 'mentioned';
        }
    };

    /**
     * Sync mentions in content with SceneCodexLinks
     * Creates new links for new mentions, marks existing as auto-detected
     * Series-first: requires seriesId for codex lookups
     */
    const syncMentions = useCallback(async (
        sceneId: string,
        projectId: string,
        seriesId: string,
        content: TiptapContent | null | undefined
    ): Promise<{ added: number; removed: number }> => {
        // Extract mentions from content
        const mentions = extractMentions(content);
        const mentionIds = new Set(mentions.map(m => m.id));

        // Get existing links for this scene
        const existingLinks = await linkRepo.getByScene(sceneId);
        const autoDetectedLinks = existingLinks.filter(l => l.autoDetected);
        const manualLinks = existingLinks.filter(l => !l.autoDetected);
        const existingAutoIds = new Set(autoDetectedLinks.map(l => l.codexId));
        const manualIds = new Set(manualLinks.map(l => l.codexId));

        // Find new mentions (not already linked manually or auto-detected)
        const newMentionIds = [...mentionIds].filter(id =>
            !existingAutoIds.has(id) && !manualIds.has(id)
        );

        // Find removed auto-detected mentions (no longer in content)
        const removedLinks = autoDetectedLinks.filter(l => !mentionIds.has(l.codexId));

        // Create new links for new mentions
        let added = 0;
        for (const mention of mentions) {
            if (newMentionIds.includes(mention.id)) {
                // Verify the codex entry still exists (using seriesId)
                const entry = await codexRepo.get(seriesId, mention.id);
                if (entry) {
                    await linkRepo.create({
                        sceneId,
                        codexId: mention.id,
                        projectId,
                        role: getRoleForCategory(entry.category),
                        autoDetected: true,
                    });
                    added++;
                }
            }
        }

        // Remove links for removed mentions
        let removed = 0;
        for (const link of removedLinks) {
            await linkRepo.delete(link.id);
            removed++;
        }

        return { added, removed };
    }, [linkRepo, codexRepo, extractMentions]);

    /**
     * Check if content has any @mentions
     */
    const hasMentions = useCallback((content: TiptapContent | null | undefined): boolean => {
        return extractMentions(content).length > 0;
    }, [extractMentions]);

    return {
        extractMentions,
        syncMentions,
        hasMentions,
    };
}

