import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { searchService, type SearchableScene, type SearchableCodex } from '@/lib/search-service';

export function useSearch() {
    const [query, setQuery] = useState('');

    // Fetch scenes and codex entries
    const scenes = useLiveQuery(() =>
        db.nodes.where('type').equals('scene').toArray()
    );

    const codexEntries = useLiveQuery(() =>
        db.codex.toArray()
    );

    // Initialize scene search index
    useEffect(() => {
        if (scenes && scenes.length > 0) {
            const searchableScenes: SearchableScene[] = scenes.map((scene) => ({
                id: scene.id,
                title: scene.title,
                content: scene.content,
                summary: scene.summary || '',
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
        isLoading: !scenes || !codexEntries,
    };
}
