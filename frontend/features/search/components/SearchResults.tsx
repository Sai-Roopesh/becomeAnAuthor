'use client';

import React from 'react';
import { SearchResultItem } from './SearchResultItem';
import { SearchEmptyState } from './SearchEmptyState';
import type { SearchResult, SearchableScene, SearchableCodex } from '@/lib/search-service';

// Union type for search results with their type
type SearchResultWithType =
    | (SearchResult<SearchableScene> & { resultType: 'scene' })
    | (SearchResult<SearchableCodex> & { resultType: 'codex' });

interface SearchResultsProps {
    results: {
        scenes: SearchResult<SearchableScene>[];
        codex: SearchResult<SearchableCodex>[];
    };
    selectedIndex: number;
    onSelect: (result: SearchResultWithType) => void;
    isLoading: boolean;
    query: string;
}

export function SearchResults({
    results,
    selectedIndex,
    onSelect,
    isLoading,
    query,
}: SearchResultsProps) {
    const allResults = [
        ...results.scenes.map((r, idx) => ({ ...r, resultType: 'scene' as const, globalIndex: idx })),
        ...results.codex.map((r, idx) => ({
            ...r,
            resultType: 'codex' as const,
            globalIndex: results.scenes.length + idx,
        })),
    ];

    if (isLoading) {
        return (
            <div className="p-8 text-center text-sm text-muted-foreground">
                Loading search index...
            </div>
        );
    }

    if (!query.trim()) {
        return (
            <div className="p-8 text-center text-sm text-muted-foreground">
                Start typing to search scenes and codex entries
            </div>
        );
    }

    if (allResults.length === 0) {
        return <SearchEmptyState query={query} />;
    }

    return (
        <div className="max-h-96 overflow-y-auto">
            {results.scenes.length > 0 && (
                <div>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                        📄 Scenes
                    </div>
                    {results.scenes.map((result, idx) => (
                        <SearchResultItem
                            key={result.item.id}
                            result={result}
                            type="scene"
                            isSelected={idx === selectedIndex}
                            onClick={() => onSelect({ ...result, resultType: 'scene' })}
                        />
                    ))}
                </div>
            )}

            {results.codex.length > 0 && (
                <div>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                        📚 Codex
                    </div>
                    {results.codex.map((result, idx) => (
                        <SearchResultItem
                            key={result.item.id}
                            result={result}
                            type="codex"
                            isSelected={results.scenes.length + idx === selectedIndex}
                            onClick={() => onSelect({ ...result, resultType: 'codex' })}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
