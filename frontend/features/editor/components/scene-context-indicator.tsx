"use client";

import { useMemo } from "react";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import type { CodexCategory, CodexEntry, CodexRelation } from "@/domain/entities/types";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    User,
    MapPin,
    Scroll,
    BookOpen,
    Sparkles,
    BookMarked,
    Link2,
    ArrowRight,
} from "lucide-react";

interface SceneContextIndicatorProps {
    sceneId: string;
    projectId: string;
    seriesId: string;
    onEntityClick?: ((codexId: string) => void) | undefined;
    onManageLinks?: (() => void) | undefined;
}

// Category configuration - reused from scene-link-panel
const CATEGORY_CONFIG: Record<
    CodexCategory,
    { icon: typeof User; label: string; color: string }
> = {
    character: {
        icon: User,
        label: "Character",
        color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
    },
    location: {
        icon: MapPin,
        label: "Location",
        color: "text-green-600 bg-green-100 dark:bg-green-900/30",
    },
    subplot: {
        icon: Scroll,
        label: "Plot Thread",
        color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
    },
    item: {
        icon: Sparkles,
        label: "Item",
        color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    },
    lore: {
        icon: BookOpen,
        label: "Lore",
        color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30",
    },
};

// Role labels for display
const ROLE_LABELS: Record<string, string> = {
    appears: "Appears",
    mentioned: "Mentioned",
    pov: "POV",
    location: "Setting",
    plot: "Plot Thread",
};

interface RelationshipDisplay {
    fromEntry: CodexEntry;
    toEntry: CodexEntry;
    label: string;
}

/**
 * Floating indicator showing codex entries linked to the current scene.
 * - Hidden when no entries are linked (zero clutter)
 * - Expands on click to show entity list
 * - Shows relationships between entities in the scene
 * - Click entity to navigate to codex or view details
 */
export function SceneContextIndicator({
    sceneId,
    projectId,
    seriesId,
    onEntityClick,
    onManageLinks,
}: SceneContextIndicatorProps) {
    const {
        sceneCodexLinkRepository: linkRepo,
        codexRepository: codexRepo,
        codexRelationRepository: relationRepo,
    } = useAppServices();

    // Get linked codex entries for this scene
    const links = useLiveQuery(
        () => linkRepo.getByScene(sceneId),
        [sceneId, linkRepo],
    );

    // Get all codex entries to resolve linked IDs
    const entries = useLiveQuery(
        () => codexRepo.getBySeries(seriesId),
        [seriesId, codexRepo],
    );

    // Combine links with their entry data
    const linkedEntries = useMemo(() => {
        if (!links || !entries) return [];
        return links
            .map((link) => ({
                link,
                entry: entries.find((e) => e.id === link.codexId),
            }))
            .filter((item): item is { link: typeof links[0]; entry: CodexEntry } =>
                item.entry !== undefined
            );
    }, [links, entries]);

    // Get IDs of linked entries for relationship lookup
    const linkedEntryIds = useMemo(() =>
        linkedEntries.map(({ entry }) => entry.id),
        [linkedEntries]
    );

    // Fetch relationships between linked entities
    const allRelations = useLiveQuery(
        async () => {
            if (linkedEntryIds.length < 2) return [];

            // Fetch relations for each linked entity
            const relationPromises = linkedEntryIds.map(id =>
                relationRepo.getByParent(id)
            );
            const relationsArrays = await Promise.all(relationPromises);
            return relationsArrays.flat();
        },
        [linkedEntryIds, relationRepo],
    );

    // Filter to only show relationships between entities in this scene
    const sceneRelationships = useMemo((): RelationshipDisplay[] => {
        if (!allRelations || !entries) return [];

        const linkedIdSet = new Set(linkedEntryIds);

        return allRelations
            .filter(rel => linkedIdSet.has(rel.childId))
            .map(rel => {
                const fromEntry = entries.find(e => e.id === rel.parentId);
                const toEntry = entries.find(e => e.id === rel.childId);
                if (!fromEntry || !toEntry) return null;
                return {
                    fromEntry,
                    toEntry,
                    label: rel.label || "related to",
                };
            })
            .filter((r): r is RelationshipDisplay => r !== null);
    }, [allRelations, entries, linkedEntryIds]);

    // Don't render if no linked entries
    if (!linkedEntries.length) {
        return null;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-4 right-4 z-20 bg-background/80 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-all gap-1.5"
                >
                    <BookMarked className="h-4 w-4" />
                    <span className="font-medium">{linkedEntries.length}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                side="top"
                className="w-80 p-0"
            >
                <div className="p-3 border-b border-border/50">
                    <h3 className="font-medium text-sm">Scene Context</h3>
                    <p className="text-xs text-muted-foreground">
                        Codex entries linked to this scene
                    </p>
                </div>
                <ScrollArea className="max-h-72">
                    {/* Entity list */}
                    <div className="p-2 space-y-1">
                        {linkedEntries.map(({ link, entry }) => {
                            const config = CATEGORY_CONFIG[entry.category];
                            const Icon = config.icon;
                            return (
                                <button
                                    key={link.id}
                                    onClick={() => onEntityClick?.(entry.id)}
                                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-muted transition-colors"
                                >
                                    <div
                                        className={`h-7 w-7 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}
                                    >
                                        {entry.thumbnail ? (
                                            <img
                                                src={entry.thumbnail}
                                                alt=""
                                                className="h-full w-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <Icon className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {entry.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {ROLE_LABELS[link.role] || link.role}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Relationships section */}
                    {sceneRelationships.length > 0 && (
                        <div className="border-t border-border/50">
                            <div className="p-2 text-xs font-medium text-muted-foreground">
                                Relationships
                            </div>
                            <div className="px-2 pb-2 space-y-1">
                                {sceneRelationships.map((rel, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md px-2 py-1.5"
                                    >
                                        <span className="font-medium text-foreground">
                                            {rel.fromEntry.name}
                                        </span>
                                        <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                        <span className="font-medium text-foreground">
                                            {rel.toEntry.name}
                                        </span>
                                        <span className="ml-1 italic">
                                            "{rel.label}"
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </ScrollArea>
                {onManageLinks && (
                    <div className="p-2 border-t border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={onManageLinks}
                        >
                            <Link2 className="h-4 w-4" />
                            Manage Links
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

