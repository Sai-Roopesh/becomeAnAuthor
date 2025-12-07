/**
 * Centralized Context Assembly Hook
 * Eliminates code duplication between AIChat and tiptap-editor
 */

import { useCallback, useRef } from 'react';
import { useNodeRepository } from './use-node-repository';
import { useCodexRepository } from './use-codex-repository';
import type { ContextItem } from '@/features/shared/components';

/**
 * Hook for assembling context from selected items
 * Provides caching to avoid re-fetching same nodes
 */
export function useContextAssembly(projectId: string) {
    const nodeRepo = useNodeRepository();
    const codexRepo = useCodexRepository();
    const cacheRef = useRef(new Map<string, string>());

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
                console.log('[ContextAssembly] Cache hit:', cacheKey);
                return cacheRef.current.get(cacheKey)!;
            }

            const { contextAssembler } = await import('@/lib/context-assembler');
            const contexts: string[] = [];

            for (const context of selectedContexts) {
                try {
                    if (context.type === 'novel') {
                        // Fetch all scenes and combine
                        const scenes = await nodeRepo.getByProject(projectId);
                        const sceneNodes = scenes.filter((n: any) => n.type === 'scene');
                        for (const scene of sceneNodes) {
                            const sceneContext = contextAssembler.createSceneContext(scene as any);
                            contexts.push(sceneContext.content);
                        }
                    } else if (context.type === 'outline') {
                        // Fetch structure outline
                        const nodes = await nodeRepo.getByProject(projectId);
                        const outline = nodes
                            .map((n: any) => `${n.type.toUpperCase()}: ${n.title}`)
                            .join('\\n');
                        contexts.push(`=== OUTLINE ===\\n${outline}`);
                    } else if (context.type === 'scene' && context.id) {
                        // Fetch specific scene
                        const scene = await nodeRepo.get(context.id);
                        if (scene) {
                            const sceneContext = contextAssembler.createSceneContext(scene as any);
                            contexts.push(sceneContext.content);
                        }
                    } else if (context.type === 'act' && context.id) {
                        // Fetch all scenes in act
                        const children = await nodeRepo.getChildren(context.id);
                        for (const child of children) {
                            if (child.type === 'scene') {
                                const sceneContext = contextAssembler.createSceneContext(child as any);
                                contexts.push(sceneContext.content);
                            } else if (child.type === 'chapter') {
                                const grandchildren = await nodeRepo.getChildren(child.id);
                                for (const scene of grandchildren.filter((n: any) => n.type === 'scene')) {
                                    const sceneContext = contextAssembler.createSceneContext(scene as any);
                                    contexts.push(sceneContext.content);
                                }
                            }
                        }
                    } else if (context.type === 'chapter' && context.id) {
                        // Fetch all scenes in chapter
                        const children = await nodeRepo.getChildren(context.id);
                        for (const scene of children.filter((n: any) => n.type === 'scene')) {
                            const sceneContext = contextAssembler.createSceneContext(scene as any);
                            contexts.push(sceneContext.content);
                        }
                    } else if (context.type === 'codex' && context.id) {
                        // Fetch codex entry
                        const entry = await codexRepo.get(context.id);
                        if (entry) {
                            const codexContext = contextAssembler.createCodexContext(entry as any);
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
        [projectId, nodeRepo, codexRepo]
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
