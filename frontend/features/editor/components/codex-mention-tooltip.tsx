"use client";

import type { CodexCategory, CodexEntry } from "@/domain/entities/types";
import {
    User,
    MapPin,
    Scroll,
    BookOpen,
    Sparkles,
    ExternalLink,
} from "lucide-react";

interface CodexMentionTooltipProps {
    entry: CodexEntry | null;
    onOpenDetail?: ((codexId: string) => void) | undefined;
}

// Category configuration
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

/**
 * Lightweight tooltip content for hovering over @mentions in the editor.
 * Shows: thumbnail, name, category, first line of description.
 * 
 * Note: This component receives entry data as props because it's rendered
 * outside the React context tree (via Tippy.js).
 */
export function CodexMentionTooltip({
    entry,
    onOpenDetail,
}: CodexMentionTooltipProps) {
    if (!entry) {
        return (
            <div className="p-2 text-sm text-muted-foreground">
                Loading...
            </div>
        );
    }

    const config = CATEGORY_CONFIG[entry.category];
    const Icon = config.icon;

    // Get first line of description (truncated)
    const descriptionText = entry.description ?? "";
    const firstLine = descriptionText.split("\n")[0] ?? "";
    const shortDescription = descriptionText
        ? firstLine.slice(0, 100) + (firstLine.length > 100 ? "..." : "")
        : "No description";

    return (
        <div className="min-w-48 max-w-64">
            <div className="flex items-start gap-2 p-2">
                {/* Thumbnail or icon */}
                <div
                    className={`h-8 w-8 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}
                >
                    {entry.thumbnail ? (
                        <img
                            src={entry.thumbnail}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                        />
                    ) : (
                        <Icon className="h-4 w-4" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{entry.name}</div>
                    <div className="text-xs text-muted-foreground">{config.label}</div>
                </div>
            </div>

            {/* Description */}
            <div className="px-2 pb-2 text-xs text-muted-foreground">
                {shortDescription}
            </div>

            {/* View details link */}
            {onOpenDetail && (
                <button
                    onClick={() => onOpenDetail(entry.id)}
                    className="w-full flex items-center gap-1 px-2 py-1.5 text-xs text-primary hover:bg-muted transition-colors border-t border-border/50"
                >
                    <ExternalLink className="h-3 w-3" />
                    View Details
                </button>
            )}
        </div>
    );
}

/**
 * Hook to create a Tippy tooltip for codex mentions.
 * Returns the HTML content to be used with tippy.
 */
export function createMentionTooltipContent(
    codexId: string,
    seriesId: string,
): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "codex-mention-tooltip bg-popover text-popover-foreground rounded-md border shadow-md overflow-hidden";
    wrapper.innerHTML = `
    <div class="min-w-48 max-w-64 p-2">
      <div class="text-sm text-muted-foreground">Loading...</div>
    </div>
  `;
    return wrapper;
}
