import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { useCodexRepository } from '@/features/codex/hooks/use-codex-repository';
import { searchService, type SearchableScene, type SearchableCodex } from '@/lib/search-service';
import { isScene, DocumentNode, CodexEntry } from '@/lib/config/types';
import { getCurrentProjectPath } from '@/infrastructure/repositories/TauriNodeRepository';

interface RustSearchResult {
    id: string;
    title: string;
    content_type: string;
    snippet: string;
    score: number;
}

export function useSearch(projectId: string) {
    const [query, setQuery] = useState('');
    const [allNodes, setAllNodes] = useState<DocumentNode[]>([]);
    const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const nodeRepo = useNodeRepository();
    const codexRepo = useCodexRepository();

    // Fetch data on mount
    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                const [nodes, codex] = await Promise.all([
                    nodeRepo.getByProject(projectId),
                    codexRepo.getByProject(projectId)
                ]);

                if (mounted) {
                    setAllNodes(nodes);
                    setCodexEntries(codex);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to fetch search data:', error);
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [projectId, nodeRepo, codexRepo]);

    // Filter to just scenes
    const scenes = useMemo(() => {
        return allNodes?.filter(node => isScene(node)) || [];
    }, [allNodes]);

    // Initialize scene search index
    useEffect(() => {
        if (scenes && scenes.length > 0) {
            const searchableScenes: SearchableScene[] = scenes
                .filter(node => isScene(node))
                .map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                    content: isScene(scene) ? scene.content : null,
                    summary: isScene(scene) ? (scene.summary || '') : '',
                    type: 'scene',
                }));
            searchService.initializeSceneSearch(searchableScenes);
        }
    }, [scenes]);

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
            const projectPath = getCurrentProjectPath();
            if (!projectPath) return [];

            return await invoke<RustSearchResult[]>('search_project', {
                projectPath,
                query: searchQuery
            });
        } catch (error) {
            console.error('Rust search failed:', error);
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
