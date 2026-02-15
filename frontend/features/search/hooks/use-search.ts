"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { searchService, type SearchableScene, type SearchableCodex } from '@/lib/search-service';
import { isScene, DocumentNode, CodexEntry, type Scene } from '@/domain/entities/types';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('useSearch');

interface RustSearchResult {
    id: string;
    title: string;
    content_type: string;
    snippet: string;
    score: number;
}

/**
 * Search hook for project content and codex entries
 * Series-first: requires seriesId for codex lookups
 */
export function useSearch(projectId: string, seriesId: string) {
    const [query, setQuery] = useState('');
    const [allNodes, setAllNodes] = useState<DocumentNode[]>([]);
    const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { nodeRepository: nodeRepo, codexRepository: codexRepo } = useAppServices();

    // Fetch data on mount
    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                const [nodes, codex] = await Promise.all([
                    nodeRepo.getByProject(projectId),
                    codexRepo.getBySeries(seriesId)
                ]);

                if (mounted) {
                    setAllNodes(nodes);
                    setCodexEntries(codex);
                    setIsLoading(false);
                }
            } catch (error) {
                log.error('Failed to fetch search data:', error);
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [projectId, seriesId, nodeRepo, codexRepo]);

    // Initialize scene search index
    useEffect(() => {
        let mounted = true;

        const hydrateScenes = async () => {
            const sceneStubs = (allNodes ?? []).filter(node => isScene(node));
            if (sceneStubs.length === 0) {
                searchService.initializeSceneSearch([]);
                return;
            }

            const hydrated = await Promise.all(
                sceneStubs.map((scene) => nodeRepo.get(scene.id))
            );
            if (!mounted) return;

            const searchableScenes: SearchableScene[] = hydrated
                .filter((node): node is Scene => Boolean(node && isScene(node)))
                .map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                    content: scene.content,
                    summary: scene.summary || '',
                    type: 'scene',
                }));

            searchService.initializeSceneSearch(searchableScenes);
        };

        void hydrateScenes();
        return () => { mounted = false; };
    }, [allNodes, nodeRepo]);

    // Initialize codex search index
    useEffect(() => {
        if (codexEntries && codexEntries.length > 0) {
            const searchableCodex: SearchableCodex[] = codexEntries.map((entry) => ({
                id: entry.id,
                name: entry.name,
                description: entry.description || '',
                category: entry.category,
                type: 'codex',
            }));
            searchService.initializeCodexSearch(searchableCodex);
        }
    }, [codexEntries]);

    // Perform search (hybrid: frontend Fuse.js + backend Rust)
    const results = useMemo(() => {
        if (!query.trim()) {
            return { scenes: [], codex: [] };
        }
        return searchService.searchAll(query);
    }, [query]);

    // Full-text search via Rust (for content within files)
    const searchContent = useCallback(async (searchQuery: string): Promise<RustSearchResult[]> => {
        if (!searchQuery.trim()) return [];

        try {
            const projectPath = TauriNodeRepository.getInstance().getProjectPath();
            if (!projectPath) return [];

            return await invoke<RustSearchResult[]>('search_project', {
                projectPath,
                query: searchQuery
            });
        } catch (error) {
            log.error('Rust search failed:', error);
            return [];
        }
    }, []);

    return {
        query,
        setQuery,
        results,
        searchContent,
        isLoading,
    };
}
