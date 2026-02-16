"use client";

import { Button } from "@/components/ui/button";
import type { CodexCategory, CodexEntry } from "@/domain/entities/types";
import { CATEGORY_CONFIG } from "../../utils/timeline-utils";

export type LaneCategory = CodexCategory;

interface TimelineControlsProps {
  visibleCategories: LaneCategory[];
  onToggleCategory: (category: LaneCategory) => void;
  codexEntries: CodexEntry[] | undefined;
  sceneCount: number;
  laneCount: number;
}

/**
 * Timeline filter controls showing category toggles and stats.
 */
export function TimelineControls({
  visibleCategories,
  onToggleCategory,
  codexEntries,
  sceneCount,
  laneCount,
}: TimelineControlsProps) {
  const categoryOrder: LaneCategory[] = [
    "character",
    "location",
    "subplot",
    "item",
    "lore",
  ];

  const categoryLabel: Record<LaneCategory, string> = {
    character: "Characters",
    location: "Locations",
    subplot: "Plots",
    item: "Items",
    lore: "Lore",
  };

  return (
    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Show:</span>
        {categoryOrder.map((cat) => {
          const config = CATEGORY_CONFIG[cat as CodexCategory];
          const Icon = config.icon;
          const isActive = visibleCategories.includes(cat);
          const count =
            codexEntries?.filter((e) => e.category === cat).length || 0;

          return (
            <Button
              key={cat}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="px-3 py-1.5 text-sm gap-1.5"
              onClick={() => onToggleCategory(cat)}
            >
              <Icon className="h-3 w-3" />
              {categoryLabel[cat]}
              <span className="text-2xs opacity-70">({count})</span>
            </Button>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground">
        {sceneCount} scenes • {laneCount} lanes
      </div>
    </div>
  );
}
