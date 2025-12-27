'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { CodexCategory, CodexEntry, SceneCodexLinkRole } from '@/domain/entities/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from '@/components/ui/sheet';
import { User, MapPin, Scroll, BookOpen, Sparkles, Plus, X, Link2, Check } from 'lucide-react';
import { toast } from '@/shared/utils/toast-service';

interface SceneLinkPanelProps {
    sceneId: string;
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    /** Trigger element (optional if using controlled mode) */
    children?: React.ReactNode;
    /** Controlled open state */
    open?: boolean;
    /** Controlled open change handler */
    onOpenChange?: (open: boolean) => void;
}

// Category configuration
const CATEGORY_CONFIG: Record<CodexCategory, { icon: typeof User; label: string; color: string }> = {
    character: { icon: User, label: 'Characters', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    location: { icon: MapPin, label: 'Locations', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    subplot: { icon: Scroll, label: 'Plot Threads', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    item: { icon: Sparkles, label: 'Items', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    lore: { icon: BookOpen, label: 'Lore', color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
};

const ROLE_OPTIONS: { value: SceneCodexLinkRole; label: string }[] = [
    { value: 'appears', label: 'Appears' },
    { value: 'mentioned', label: 'Mentioned' },
    { value: 'pov', label: 'POV Character' },
    { value: 'location', label: 'Setting' },
    { value: 'plot', label: 'Plot Thread' },
];

/**
 * Side panel for linking codex entries to a scene
 * Allows adding/removing links with role specification
 * Series-first: uses seriesId for codex lookups
 */
export function SceneLinkPanel({
    sceneId,
    projectId,
    seriesId,
    children,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange
}: SceneLinkPanelProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [internalOpen, setInternalOpen] = useState(false);

    // Support both controlled and uncontrolled modes
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? (controlledOnOpenChange ?? (() => { })) : setInternalOpen;

    const { sceneCodexLinkRepository: linkRepo, codexRepository: codexRepo } = useAppServices();

    // Get all codex entries (series-level)
    const entries = useLiveQuery(
        () => codexRepo.getBySeries(seriesId),
        [seriesId, codexRepo]
    );

    // Get existing links for this scene
    const links = useLiveQuery(
        () => linkRepo.getByScene(sceneId),
        [sceneId, linkRepo]
    );

    // Filter entries by search
    const filteredEntries = useMemo(() => {
        if (!entries) return [];
        if (!searchQuery) return entries;
        const query = searchQuery.toLowerCase();
        return entries.filter(e =>
            e.name.toLowerCase().includes(query) ||
            e.aliases.some(a => a.toLowerCase().includes(query))
        );
    }, [entries, searchQuery]);

    // Group by category
    const groupedEntries = useMemo(() => {
        const groups: Record<CodexCategory, CodexEntry[]> = {
            character: [],
            location: [],
            subplot: [],
            item: [],
            lore: [],
        };
        filteredEntries.forEach(e => groups[e.category].push(e));
        return groups;
    }, [filteredEntries]);

    // Check if entry is linked
    const isLinked = (codexId: string) => links?.some(l => l.codexId === codexId);
    const getLink = (codexId: string) => links?.find(l => l.codexId === codexId);

    // Get default role based on category
    const getDefaultRole = (category: CodexCategory): SceneCodexLinkRole => {
        switch (category) {
            case 'character': return 'appears';
            case 'location': return 'location';
            case 'subplot': return 'plot';
            default: return 'mentioned';
        }
    };

    // Toggle link
    const toggleLink = async (entry: CodexEntry) => {
        const existingLink = getLink(entry.id);

        if (existingLink) {
            await linkRepo.delete(existingLink.id);
            toast.success(`Unlinked ${entry.name}`);
        } else {
            await linkRepo.create({
                sceneId,
                codexId: entry.id,
                projectId,
                role: getDefaultRole(entry.category),
            });
            toast.success(`Linked ${entry.name}`);
        }
    };

    // Update role
    const updateRole = async (codexId: string, role: SceneCodexLinkRole) => {
        const link = getLink(codexId);
        if (link) {
            await linkRepo.update(link.id, { role });
            toast.success('Role updated');
        }
    };

    // Get linked entries grouped by category
    const linkedEntries = useMemo(() => {
        if (!entries || !links) return [];
        return links.map(link => ({
            link,
            entry: entries.find(e => e.id === link.codexId)!,
        })).filter(({ entry }) => entry);
    }, [entries, links]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {children && (
                <SheetTrigger asChild>
                    {children}
                </SheetTrigger>
            )}
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Link Codex Entries
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                    {/* Linked Entries */}
                    {linkedEntries.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Currently Linked</h3>
                            <div className="space-y-1">
                                {linkedEntries.map(({ link, entry }) => {
                                    const config = CATEGORY_CONFIG[entry.category];
                                    const Icon = config.icon;
                                    return (
                                        <div
                                            key={link.id}
                                            className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
                                        >
                                            <div className={`h-8 w-8 rounded-full ${config.color} flex items-center justify-center`}>
                                                {entry.thumbnail ? (
                                                    <img src={entry.thumbnail} alt="" className="h-full w-full rounded-full object-cover" />
                                                ) : (
                                                    <Icon className="h-4 w-4" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{entry.name}</div>
                                                <select
                                                    value={link.role}
                                                    onChange={(e) => updateRole(entry.id, e.target.value as SceneCodexLinkRole)}
                                                    className="text-xs text-muted-foreground bg-transparent border-none p-0 cursor-pointer hover:text-foreground"
                                                >
                                                    {ROLE_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => toggleLink(entry)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <Input
                        placeholder="Search codex entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Available Entries */}
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                            {(Object.entries(groupedEntries) as [CodexCategory, CodexEntry[]][]).map(([category, catEntries]) => {
                                if (catEntries.length === 0) return null;
                                const config = CATEGORY_CONFIG[category];
                                const Icon = config.icon;

                                return (
                                    <div key={category}>
                                        <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                            <Icon className="h-3 w-3" />
                                            {config.label}
                                        </h4>
                                        <div className="space-y-1">
                                            {catEntries.map(entry => {
                                                const linked = isLinked(entry.id);
                                                return (
                                                    <button
                                                        key={entry.id}
                                                        onClick={() => toggleLink(entry)}
                                                        className={`
                                                            w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors
                                                            ${linked
                                                                ? 'bg-primary/10 border border-primary/20'
                                                                : 'hover:bg-muted border border-transparent'
                                                            }
                                                        `}
                                                    >
                                                        <div className={`h-7 w-7 rounded-full ${config.color} flex items-center justify-center`}>
                                                            {entry.thumbnail ? (
                                                                <img src={entry.thumbnail} alt="" className="h-full w-full rounded-full object-cover" />
                                                            ) : (
                                                                <Icon className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                        <span className="flex-1 text-sm truncate">{entry.name}</span>
                                                        {linked ? (
                                                            <Check className="h-4 w-4 text-primary" />
                                                        ) : (
                                                            <Plus className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}
