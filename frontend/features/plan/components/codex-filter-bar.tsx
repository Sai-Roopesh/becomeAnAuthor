'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import type { CodexCategory, CodexEntry } from '@/domain/entities/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Scroll, BookOpen, Sparkles, X, Filter } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CodexFilterBarProps {
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    /** Currently selected codex entry IDs */
    selectedIds: string[];
    /** Callback when selection changes */
    onSelectionChange: (ids: string[]) => void;
    /** Optional category filter */
    categoryFilter?: CodexCategory | null;
    onCategoryFilterChange?: (category: CodexCategory | null) => void;
}

// Category configuration
const CATEGORIES: { id: CodexCategory; label: string; icon: typeof User; color: string }[] = [
    { id: 'character', label: 'Characters', icon: User, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'location', label: 'Locations', icon: MapPin, color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' },
    { id: 'subplot', label: 'Plots', icon: Scroll, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400' },
    { id: 'item', label: 'Items', icon: Sparkles, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: 'lore', label: 'Lore', icon: BookOpen, color: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400' },
];

/**
 * Filter bar for selecting codex entries to filter scenes by
 * Shows category pills and selected entry chips
 * Series-first: uses seriesId for codex lookups
 */
export function CodexFilterBar({
    projectId,
    seriesId,
    selectedIds,
    onSelectionChange,
    categoryFilter,
    onCategoryFilterChange,
}: CodexFilterBarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [popoverOpen, setPopoverOpen] = useState(false);
    const codexRepo = useCodexRepository();

    // Get all codex entries for the series (series-first architecture)
    const entries = useLiveQuery(
        () => codexRepo.getBySeries(seriesId),
        [seriesId, codexRepo]
    );

    // Filter entries by category and search
    const filteredEntries = useMemo(() => {
        if (!entries) return [];
        return entries.filter(entry => {
            const matchesCategory = !categoryFilter || entry.category === categoryFilter;
            const matchesSearch = !searchQuery ||
                entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [entries, categoryFilter, searchQuery]);

    // Get selected entries for display
    const selectedEntries = useMemo(() => {
        if (!entries) return [];
        return entries.filter(e => selectedIds.includes(e.id));
    }, [entries, selectedIds]);

    // Group entries by category for display
    const entriesByCategory = useMemo(() => {
        return CATEGORIES.reduce((acc, cat) => {
            acc[cat.id] = filteredEntries.filter(e => e.category === cat.id);
            return acc;
        }, {} as Record<CodexCategory, CodexEntry[]>);
    }, [filteredEntries]);

    const toggleEntry = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(i => i !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    const clearAll = () => {
        onSelectionChange([]);
        onCategoryFilterChange?.(null);
    };

    const getCategoryConfig = (category: CodexCategory) =>
        CATEGORIES.find(c => c.id === category)!;

    return (
        <div className="flex flex-col gap-2">
            {/* Category Pills Row */}
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    variant={!categoryFilter ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onCategoryFilterChange?.(null)}
                >
                    All
                </Button>
                {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const count = entries?.filter(e => e.category === cat.id).length || 0;
                    const isActive = categoryFilter === cat.id;

                    return (
                        <Button
                            key={cat.id}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            className={`h-7 text-xs gap-1.5 ${isActive ? '' : cat.color}`}
                            onClick={() => onCategoryFilterChange?.(isActive ? null : cat.id)}
                        >
                            <Icon className="h-3 w-3" />
                            {cat.label}
                            <span className="text-[10px] opacity-70">({count})</span>
                        </Button>
                    );
                })}

                {/* Add Filter Button */}
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                            <Filter className="h-3 w-3" />
                            Add Filter
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                        <div className="space-y-3">
                            <Input
                                placeholder="Search entries..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 text-sm"
                            />
                            <ScrollArea className="h-64">
                                <div className="space-y-3">
                                    {CATEGORIES.map(cat => {
                                        const catEntries = entriesByCategory[cat.id];
                                        if (catEntries.length === 0) return null;

                                        const Icon = cat.icon;
                                        return (
                                            <div key={cat.id}>
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                                                    <Icon className="h-3 w-3" />
                                                    {cat.label}
                                                </div>
                                                <div className="space-y-1">
                                                    {catEntries.map(entry => (
                                                        <button
                                                            key={entry.id}
                                                            onClick={() => toggleEntry(entry.id)}
                                                            className={`
                                                                w-full text-left px-2 py-1.5 rounded text-sm
                                                                transition-colors flex items-center gap-2
                                                                ${selectedIds.includes(entry.id)
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : 'hover:bg-muted'
                                                                }
                                                            `}
                                                        >
                                                            {entry.thumbnail ? (
                                                                <img
                                                                    src={entry.thumbnail}
                                                                    alt=""
                                                                    className="h-5 w-5 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className={`h-5 w-5 rounded-full ${cat.color} flex items-center justify-center`}>
                                                                    <Icon className="h-2.5 w-2.5" />
                                                                </div>
                                                            )}
                                                            <span className="truncate">{entry.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Active Filters Row */}
            {selectedEntries.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Active:</span>
                    {selectedEntries.map(entry => {
                        const config = getCategoryConfig(entry.category);
                        const Icon = config.icon;
                        return (
                            <Badge
                                key={entry.id}
                                variant="secondary"
                                className={`gap-1 pr-1 ${config.color}`}
                            >
                                <Icon className="h-3 w-3" />
                                {entry.name}
                                <button
                                    onClick={() => toggleEntry(entry.id)}
                                    className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        );
                    })}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground"
                        onClick={clearAll}
                    >
                        Clear All
                    </Button>
                </div>
            )}
        </div>
    );
}
