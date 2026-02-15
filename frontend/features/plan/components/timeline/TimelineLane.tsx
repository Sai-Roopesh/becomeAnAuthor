"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  DocumentNode,
  CodexEntry,
  SceneCodexLink,
} from "@/domain/entities/types";
import { CATEGORY_CONFIG } from "../../utils/timeline-utils";

interface TimelineLaneProps {
  lane: CodexEntry;
  scenes: DocumentNode[];
  sceneIndices: number[];
  links: SceneCodexLink[] | undefined;
  onOpenScene: (sceneId: string) => void;
}

/**
 * Individual timeline lane showing node appearances for a codex entry.
 */

/**
 * Individual timeline lane showing node appearances for a codex entry.
 * Uses CSS Grid for precise alignment without fragile pixel math.
 */
export function TimelineLane({
  lane,
  scenes,
  sceneIndices,
  links,
  onOpenScene,
}: TimelineLaneProps) {
  const config = CATEGORY_CONFIG[lane.category];

  const startIndex = sceneIndices.length > 0 ? (sceneIndices[0] ?? 0) : 0;
  const endIndex =
    sceneIndices.length > 0 ? (sceneIndices[sceneIndices.length - 1] ?? 0) : 0;
  const startPercent =
    scenes.length > 0 ? ((startIndex + 0.5) / scenes.length) * 100 : 0;
  const endPercent =
    scenes.length > 0 ? ((endIndex + 0.5) / scenes.length) * 100 : 0;
  const lineWidth = Math.max(endPercent - startPercent, 0);

  return (
    <div
      key={lane.id}
      className={`relative border-b ${config.bgColor} h-12 grid items-center px-4`}
      style={{
        gridTemplateColumns: `repeat(${scenes.length}, minmax(120px, 1fr))`,
        gap: "0.5rem",
        minWidth: "max-content",
      }}
    >
      {sceneIndices.length > 1 && (
        <div
          className={`absolute top-1/2 h-0.5 ${config.color} opacity-30 z-0`}
          style={{
            left: `${startPercent}%`,
            width: `${lineWidth}%`,
            height: "2px",
            zIndex: 0,
          }}
        />
      )}

      {/* Scene nodes */}
      {sceneIndices.map((sceneIndex) => {
        const scene = scenes[sceneIndex];
        if (!scene) return null;
        const link = links?.find(
          (l) => l.sceneId === scene.id && l.codexId === lane.id,
        );
        const isPov = link?.role === "pov";

        return (
          <Tooltip key={scene.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onOpenScene(scene.id)}
                className={`
                  relative z-10
                  h-8 rounded-md border-2 ${config.borderColor}
                  bg-background hover:bg-accent
                  flex items-center justify-center
                  text-xs font-medium truncate px-2
                  transition-all hover:scale-105 hover:shadow-md
                  w-full
                  ${isPov ? "ring-2 ring-primary ring-offset-1" : ""}
                `}
                style={{
                  gridColumn: sceneIndex + 1, // 1-based index for grid
                }}
              >
                <span className="truncate">{scene.title}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="font-medium">{scene.title}</div>
              {isPov && (
                <div className="text-xs text-primary">POV Character</div>
              )}
              <div className="text-xs text-muted-foreground">
                {scene.type === "scene" && "wordCount" in scene
                  ? scene.wordCount
                  : 0}{" "}
                words
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
