"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { useSearch } from "../hooks/use-search";
import { useProjectStore } from "@/store/use-project-store";
import { Button } from "@/components/ui/button";

interface SearchPaletteProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchPalette({
  projectId,
  open,
  onOpenChange,
}: SearchPaletteProps) {
  const { query, setQuery, scope, setScope, results, isLoading } =
    useSearch(projectId);
  const {
    setActiveSceneId,
    setViewMode,
    setLeftSidebarTab,
    setActiveCodexEntryId,
  } = useProjectStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
      setScope("all");
    }
  }, [open, setQuery, setScope]);

  // Calculate total results for keyboard navigation
  const allResults = React.useMemo(
    () => [
      ...results.scenes.map((r) => ({ ...r, resultType: "scene" as const })),
      ...results.codex.map((r) => ({ ...r, resultType: "codex" as const })),
    ],
    [results.scenes, results.codex],
  );

  const handleSelect = useCallback(
    async (result: (typeof allResults)[0]) => {
      if (result.resultType === "scene") {
        // Navigate to scene
        await setActiveSceneId(result.item.id);
        setViewMode("write");
        onOpenChange(false);
      } else {
        // Navigate to codex entry in write mode sidebar
        setViewMode("write");
        setLeftSidebarTab("codex");
        setActiveCodexEntryId(result.item.id);
        onOpenChange(false);
      }
    },
    [
      setActiveSceneId,
      setViewMode,
      setLeftSidebarTab,
      setActiveCodexEntryId,
      onOpenChange,
    ],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allResults.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (
        e.key === "Enter" &&
        allResults.length > 0 &&
        allResults[selectedIndex]
      ) {
        e.preventDefault();
        handleSelect(allResults[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, allResults, handleSelect]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col p-0 gap-0">
        <VisuallyHidden>
          <DialogTitle>Search Palette</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search manuscript and codex..."
          />
          <div className="px-4 py-2 border-b bg-muted/20 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={scope === "all" ? "secondary" : "ghost"}
              onClick={() => setScope("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={scope === "scenes" ? "secondary" : "ghost"}
              onClick={() => setScope("scenes")}
            >
              Scenes
            </Button>
            <Button
              size="sm"
              variant={scope === "codex" ? "secondary" : "ghost"}
              onClick={() => setScope("codex")}
            >
              Codex
            </Button>
          </div>
          <SearchResults
            results={results}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            isLoading={isLoading}
            query={query}
          />
        </div>

        {/* Footer with keyboard hints */}
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3">
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
