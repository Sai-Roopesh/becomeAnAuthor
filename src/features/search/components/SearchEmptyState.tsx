'use client';

import { SearchX } from 'lucide-react';

interface SearchEmptyStateProps {
    query: string;
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
    return (
        <div className="p-12 text-center">
            <SearchX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <div className="text-sm font-medium mb-1">No results found</div>
            <div className="text-xs text-muted-foreground">
                No scenes or codex entries match "{query}"
            </div>
        </div>
    );
}
