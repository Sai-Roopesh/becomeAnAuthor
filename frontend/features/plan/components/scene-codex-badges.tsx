'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import { useSceneCodexLinkRepository } from '@/hooks/use-scene-codex-link-repository';
import { useCodexRepository } from '@/features/codex/hooks/use-codex-repository';
import type { CodexEntry, SceneCodexLink, CodexCategory } from '@/lib/config/types';
import { User, MapPin, Scroll, BookOpen, Sparkles } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface SceneCodexBadgesProps {
    sceneId: string;
    projectId: string;
    /** Maximum number of badges to show before "+N more" */
    maxBadges?: number;
    /** Size variant */
    size?: 'sm' | 'md';
}

// Category icons and colors
const CATEGORY_CONFIG: Record<CodexCategory, { icon: typeof User; color: string; bgColor: string }> = {
    character: { icon: User, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    location: { icon: MapPin, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    subplot: { icon: Scroll, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    item: { icon: Sparkles, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    lore: { icon: BookOpen, color: 'text-rose-600', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
};

/**
 * Displays codex entry badges (characters, locations, plots) for a scene
 * Used in scene cards to show which codex entries appear in the scene
 */
export function SceneCodexBadges({
    sceneId,
    projectId,
    maxBadges = 4,
    size = 'sm'
}: SceneCodexBadgesProps) {
    const linkRepo = useSceneCodexLinkRepository();
    const codexRepo = useCodexRepository();

    // Get all links for this scene
    const links = useLiveQuery(
        () => linkRepo.getByScene(sceneId),
        [sceneId, linkRepo]
    );

    // Get codex entries for the linked IDs
    const entries = useLiveQuery(
        async () => {
            if (!links || links.length === 0) return [];
            const codexIds = links.map(l => l.codexId);
            const allEntries = await codexRepo.getByProject(projectId);
            return allEntries.filter(e => codexIds.includes(e.id));
        },
        [links, projectId, codexRepo]
    );

    if (!entries || entries.length === 0) {
        return null;
    }

    // Group entries by category for better display
    const groupedByCategory = entries.reduce((acc, entry) => {
        if (!acc[entry.category]) acc[entry.category] = [];
        acc[entry.category].push(entry);
        return acc;
    }, {} as Record<CodexCategory, CodexEntry[]>);

    // Flatten to display order: characters first, then locations, then others
    const categoryOrder: CodexCategory[] = ['character', 'location', 'subplot', 'item', 'lore'];
    const sortedEntries = categoryOrder.flatMap(cat => groupedByCategory[cat] || []);

    const displayEntries = sortedEntries.slice(0, maxBadges);
    const remainingCount = sortedEntries.length - maxBadges;

    const sizeClasses = size === 'sm'
        ? 'h-5 w-5 text-[10px]'
        : 'h-6 w-6 text-xs';

    const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {displayEntries.map((entry) => {
                const config = CATEGORY_CONFIG[entry.category];
                const Icon = config.icon;
                const link = links?.find(l => l.codexId === entry.id);
                const isPov = link?.role === 'pov';

                return (
                    <Tooltip key={entry.id}>
                        <TooltipTrigger asChild>
                            <div
                                className={`
                                    ${sizeClasses} ${config.bgColor} ${config.color}
                                    rounded-full flex items-center justify-center
                                    ring-1 ring-black/5 dark:ring-white/10
                                    ${isPov ? 'ring-2 ring-primary' : ''}
                                    transition-transform hover:scale-110 cursor-pointer
                                `}
                                title={entry.name}
                            >
                                {entry.thumbnail ? (
                                    <img
                                        src={entry.thumbnail}
                                        alt={entry.name}
                                        className="h-full w-full rounded-full object-cover"
                                    />
                                ) : (
                                    <Icon className={iconSize} />
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            <div className="flex items-center gap-1.5">
                                <Icon className="h-3 w-3" />
                                <span className="font-medium">{entry.name}</span>
                                {isPov && (
                                    <span className="text-[10px] px-1 py-0.5 bg-primary/10 text-primary rounded">POV</span>
                                )}
                            </div>
                            <div className="text-muted-foreground capitalize">{entry.category}</div>
                        </TooltipContent>
                    </Tooltip>
                );
            })}

            {remainingCount > 0 && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={`
                                ${sizeClasses} bg-muted text-muted-foreground
                                rounded-full flex items-center justify-center
                                text-[10px] font-medium cursor-pointer
                                hover:bg-muted/80 transition-colors
                            `}
                        >
                            +{remainingCount}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                        <div className="font-medium mb-1">Also appears:</div>
                        {sortedEntries.slice(maxBadges).map(entry => (
                            <div key={entry.id} className="flex items-center gap-1.5">
                                {(() => {
                                    const Icon = CATEGORY_CONFIG[entry.category].icon;
                                    return <Icon className="h-3 w-3" />;
                                })()}
                                <span>{entry.name}</span>
                            </div>
                        ))}
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
