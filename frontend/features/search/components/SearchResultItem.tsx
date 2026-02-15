"use client";

import React from "react";
import { FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SearchResult,
  SearchableScene,
  SearchableCodex,
} from "@/lib/search-service";

interface SearchResultItemProps {
  result: SearchResult<SearchableScene> | SearchResult<SearchableCodex>;
  type: "scene" | "codex";
  isSelected: boolean;
  onClick: () => void;
}

export function SearchResultItem({
  result,
  type,
  isSelected,
  onClick,
}: SearchResultItemProps) {
  const Icon = type === "scene" ? FileText : BookOpen;
  const sceneSubtext =
    (result.item as SearchableScene).summary || "Scene content match";
  const codexCategory = (result.item as SearchableCodex).category;
  const codexDescription = (result.item as SearchableCodex).description;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left",
        isSelected && "bg-accent",
      )}
    >
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {type === "scene"
            ? (result.item as SearchableScene).title
            : (result.item as SearchableCodex).name}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {type === "scene" ? (
            sceneSubtext
          ) : (
            <>
              <span>{codexCategory}</span>
              {codexDescription ? <span> • {codexDescription}</span> : null}
            </>
          )}
        </div>
      </div>
      {isSelected && (
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground">
          ↵
        </kbd>
      )}
    </button>
  );
}
