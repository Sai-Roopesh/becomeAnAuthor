"use client";
/**
 * Centralized Context Assembly Hook
 * Eliminates code duplication between AIChat and tiptap-editor
 */

import { useCallback, useRef } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { logger } from '@/core/logger';
import type { ContextItem } from '@/features/shared/components';
import type { Scene, Act, Chapter, BaseNode } from '@/domain/entities/types';

// Union type for all node types
type StoryNode = Scene | Act | Chapter | (BaseNode & { type: string });

// Type guard for scene nodes
function isSceneNode(node: StoryNode): node is Scene {
    return node.type === 'scene';
}

/**
 * Hook for assembling context from selected items
 * Provides caching to avoid re-fetching same nodes
 * Series-first: requires seriesId for codex lookups
 */
export function useContextAssembly(projectId: string, seriesId?: string) {
    const { nodeRepository: nodeRepo, codexRepository: codexRepo, projectRepository: projectRepo } = useAppServices();
    const cacheRef = useRef(new Map<string, string>());

    // We may need to fetch the project to get seriesId if not provided
    const resolvedSeriesIdRef = useRef<string | undefined>(seriesId);

    // Update the ref when seriesId changes
    if (seriesId) {
        resolvedSeriesIdRef.current = seriesId;
    }

    /**
     * Assemble context from selected context items
     * Supports: scenes, acts, chapters, full novel, outline, codex entries
     */
    const assembleContext = useCallback(
        async (selectedContexts: ContextItem[]): Promise<string> => {
            if (selectedContexts.length === 0) return '';

            // Check cache first
            const cacheKey = selectedContexts
                .map((c) => `${c.type}:${c.id || 'global'}`)
                .sort()
                .join('|');

            if (cacheRef.current.has(cacheKey)) {
                logger.debug('[ContextAssembly] Cache hit', { cacheKey });
                return cacheRef.current.get(cacheKey)!;
            }

            // Resolve seriesId if not provided (fallback for backward compatibility)
            let effectiveSeriesId = resolvedSeriesIdRef.current;
            if (!effectiveSeriesId) {
                const project = await projectRepo.get(projectId);
                effectiveSeriesId = project?.seriesId;
            }

            const { contextAssembler } = await import('@/shared/utils/context-assembler');
            const contexts: string[] = [];

            for (const context of selectedContexts) {
                try {
                    if (context.type === 'novel') {
                        // Fetch all scenes and combine
                        const nodes = await nodeRepo.getByProject(projectId) as StoryNode[];
                        const sceneNodes = nodes.filter(isSceneNode);
                        for (const scene of sceneNodes) {
                            const sceneContext = contextAssembler.createSceneContext(scene);
                            contexts.push(sceneContext.content);
                        }
                    } else if (context.type === 'outline') {
                        // Fetch structure outline
                        const nodes = await nodeRepo.getByProject(projectId) as StoryNode[];
                        const outline = nodes
                            .map((n) => `${n.type.toUpperCase()}: ${n.title}`)
                            .join('\\n');
                        contexts.push(`=== OUTLINE ===\\n${outline}`);
                    } else if (context.type === 'scene' && context.id) {
                        // Fetch specific scene
                        const scene = await nodeRepo.get(context.id) as Scene | undefined;
                        if (scene) {
                            const sceneContext = contextAssembler.createSceneContext(scene);
                            contexts.push(sceneContext.content);
                        }
                    } else if (context.type === 'act' && context.id) {
                        // Fetch all scenes in act
                        const children = await nodeRepo.getChildren(context.id) as StoryNode[];
                        for (const child of children) {
                            if (isSceneNode(child)) {
                                const sceneContext = contextAssembler.createSceneContext(child);
                                contexts.push(sceneContext.content);
                            } else if (child.type === 'chapter') {
                                const grandchildren = await nodeRepo.getChildren(child.id) as StoryNode[];
                                for (const scene of grandchildren.filter(isSceneNode)) {
                                    const sceneContext = contextAssembler.createSceneContext(scene);
                                    contexts.push(sceneContext.content);
                                }
                            }
                        }
                    } else if (context.type === 'chapter' && context.id) {
                        // Fetch all scenes in chapter
                        const children = await nodeRepo.getChildren(context.id) as StoryNode[];
                        for (const scene of children.filter(isSceneNode)) {
                            const sceneContext = contextAssembler.createSceneContext(scene);
                            contexts.push(sceneContext.content);
                        }
                    } else if (context.type === 'codex' && context.id && effectiveSeriesId) {
                        // Fetch codex entry - series-first: use seriesId
                        const entry = await codexRepo.get(effectiveSeriesId, context.id);
                        if (entry) {
                            const codexContext = contextAssembler.createCodexContext(entry);
                            contexts.push(codexContext.content);
                        }
                    }
                } catch (error) {
                    console.error(`[ContextAssembly] Failed to load ${context.label}:`, error);
                    contexts.push(`[${context.label}]: Failed to load content`);
                }
            }

            const result = contexts.join('\\n\\n---\\n\\n');

            // Cache the result
            cacheRef.current.set(cacheKey, result);

            // Limit cache size to prevent memory issues
            if (cacheRef.current.size > 50) {
                const firstKey = cacheRef.current.keys().next().value;
                if (firstKey !== undefined) {
                    cacheRef.current.delete(firstKey);
                }
            }

            return result;
        },
        [projectId, nodeRepo, codexRepo, projectRepo]
    );

    /**
     * Clear the context cache
     * Useful when nodes/codex entries are updated
     */
    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    return {
        assembleContext,
        clearCache,
    };
}
