import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { searchService, type SearchableScene, type SearchableCodex } from '@/lib/search-service';
import { isScene, DocumentNode, CodexEntry } from '@/lib/config/types';

export function useSearch(projectId: string) {
    const [query, setQuery] = useState('');
    const nodeRepo = useNodeRepository();
    const codexRepo = useCodexRepository();

    // Fetch scenes and codex entries using repositories
    const allNodes = useLiveQuery(
        () => nodeRepo.getByProject(projectId),
        [projectId, nodeRepo]
    );

    const codexEntries = useLiveQuery(
        () => codexRepo.getByProject(projectId),
        [projectId, codexRepo]
    );

    // Filter to just scenes
    const scenes = useMemo(() => {
        return allNodes?.filter(node => isScene(node)) || [];
    }, [allNodes]);

    // Initialize scene search index
    useEffect(() => {
        if (scenes && scenes.length > 0) {
            const searchableScenes: SearchableScene[] = scenes
                .filter(node => isScene(node)) // Filter to ensure we only process actual scene nodes
                .map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                    content: isScene(scene) ? scene.content : null, // Apply type guard before accessing content
                    summary: isScene(scene) ? (scene.summary || '') : '', // Apply type guard before accessing summary
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

    // Perform search
    const results = useMemo(() => {
        if (!query.trim()) {
            return { scenes: [], codex: [] };
        }
        return searchService.searchAll(query);
    }, [query]);

    return {
        query,
        setQuery,
        results,
        isLoading: !allNodes || !codexEntries,
    };
}
