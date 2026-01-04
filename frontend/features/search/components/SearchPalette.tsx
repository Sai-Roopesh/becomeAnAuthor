'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { useSearch } from '../hooks/use-search';
import { useProjectStore } from '@/store/use-project-store';

interface SearchPaletteProps {
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SearchPalette({ projectId, seriesId, open, onOpenChange }: SearchPaletteProps) {
    const { query, setQuery, results, isLoading } = useSearch(projectId, seriesId);
    const { setActiveSceneId, setViewMode } = useProjectStore();
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [open, setQuery]);


    // Calculate total results for keyboard navigation
    const allResults = React.useMemo(() => [
        ...results.scenes.map(r => ({ ...r, resultType: 'scene' as const })),
        ...results.codex.map(r => ({ ...r, resultType: 'codex' as const })),
    ], [results.scenes, results.codex]);

    const handleSelect = useCallback(async (result: typeof allResults[0]) => {
        if (result.resultType === 'scene') {
            // Navigate to scene
            await setActiveSceneId(result.item.id);
            setViewMode('write');
            onOpenChange(false);
        } else {
            // Navigate to codex (future: implement codex view)
            // For now, just close the palette
            onOpenChange(false);
        }
    }, [setActiveSceneId, setViewMode, onOpenChange]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < allResults.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter' && allResults.length > 0 && allResults[selectedIndex]) {
                e.preventDefault();
                handleSelect(allResults[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, selectedIndex, allResults, handleSelect]);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0">
                <VisuallyHidden>
                    <DialogTitle>Search Palette</DialogTitle>
                </VisuallyHidden>
                <div className="flex flex-col">
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder="Search scenes and codex..."
                    />
                    <SearchResults
                        results={results}
                        selectedIndex={selectedIndex}
                        onSelect={handleSelect}
                        isLoading={isLoading}
                        query={query}
                    />
                </div>

                {/* Footer with keyboard hints */}
                <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↵</kbd>
                            Select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd>
                            Close
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
