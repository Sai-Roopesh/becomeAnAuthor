"use client";

import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import type { CodexCategory } from "@/domain/entities/types";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  List,
  Table,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Map as MapIcon,
  Calendar,
} from "lucide-react";
import { GridView } from "./grid-view";
import { OutlineView } from "./outline-view";
import { MatrixView } from "./matrix-view";
import { TimelineView } from "./timeline-view";
import { MapView } from "./map-view";
import { WorldTimelineView } from "./world-timeline-view";
import { CodexFilterBar } from "@/features/plan/components/codex-filter-bar";

type PlanViewType =
  | "grid"
  | "outline"
  | "matrix"
  | "timeline"
  | "map"
  | "world";

export function PlanView({ projectId }: { projectId: string }) {
  const {
    nodeRepository: nodeRepo,
    projectRepository: projectRepo,
    sceneCodexLinkRepository: linkRepo,
    codexRepository: codexRepo,
  } = useAppServices();

  const [viewType, setViewType] = useState<PlanViewType>("grid");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCodexIds, setSelectedCodexIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CodexCategory | null>(
    null,
  );

  const project = useLiveQuery(
    () => projectRepo.get(projectId),
    [projectId, projectRepo],
  );
  const nodes = useLiveQuery(
    () => nodeRepo.getByProject(projectId),
    [projectId, nodeRepo],
  );

  // Get all scene-codex links for filtering
  const allLinks = useLiveQuery(
    () => linkRepo.getByProject(projectId),
    [projectId, linkRepo],
  );
  const codexEntries = useLiveQuery(
    () =>
      project ? codexRepo.getBySeries(project.seriesId) : Promise.resolve([]),
    [project?.seriesId, codexRepo],
  );

  // Filter nodes based on selected codex entries + category filter
  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    if (selectedCodexIds.length === 0 && categoryFilter === null) return nodes;

    const selectedSceneIds = new Set(
      allLinks
        ?.filter((link) => selectedCodexIds.includes(link.codexId))
        .map((link) => link.sceneId) || [],
    );

    const categoryCodexIds = new Set(
      codexEntries
        ?.filter(
          (entry) =>
            categoryFilter === null || entry.category === categoryFilter,
        )
        .map((entry) => entry.id) || [],
    );
    const categorySceneIds = new Set(
      allLinks
        ?.filter(
          (link) =>
            categoryFilter !== null && categoryCodexIds.has(link.codexId),
        )
        .map((link) => link.sceneId) || [],
    );

    // Keep all non-scene nodes (acts, chapters) and scenes that match filter
    return nodes.filter((node) => {
      if (node.type !== "scene") return true; // Keep structure nodes
      if (selectedCodexIds.length > 0 && !selectedSceneIds.has(node.id))
        return false;
      if (categoryFilter !== null && !categorySceneIds.has(node.id))
        return false;
      return true;
    });
  }, [nodes, selectedCodexIds, allLinks, categoryFilter, codexEntries]);

  if (!project || !nodes) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasActiveFilters =
    selectedCodexIds.length > 0 || categoryFilter !== null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* View Switcher - Segmented Control */}
          <div className="flex p-1 bg-muted/50 rounded-lg border border-border/50 shadow-inner overflow-x-auto whitespace-nowrap">
            {(
              ["grid", "outline", "matrix", "timeline", "map", "world"] as const
            ).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`
                                    flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                                    ${
                                      viewType === type
                                        ? "bg-background text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    }
                                `}
              >
                {type === "grid" && <LayoutGrid className="h-4 w-4" />}
                {type === "outline" && <List className="h-4 w-4" />}
                {type === "matrix" && <Table className="h-4 w-4" />}
                {type === "timeline" && <Layers className="h-4 w-4" />}
                {type === "map" && <MapIcon className="h-4 w-4" />}
                {type === "world" && <Calendar className="h-4 w-4" />}
                <span className="capitalize">{type}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 w-full max-w-md relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search scenes, characters, plot points..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50 focus:bg-background transition-all"
            />
          </div>

          {/* Filter Toggle & Settings */}
          <div className="flex items-center gap-2">
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="ml-1 h-5 w-5 bg-primary-foreground text-primary text-xs rounded-full flex items-center justify-center">
                  {selectedCodexIds.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Bar (expandable) */}
        {showFilters && (
          <div className="px-4 pb-4 border-t pt-3 bg-muted/30">
            <CodexFilterBar
              seriesId={project.seriesId}
              selectedIds={selectedCodexIds}
              onSelectionChange={setSelectedCodexIds}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
            />
          </div>
        )}
      </div>

      {/* Main View */}
      <div
        className={`flex-1 overflow-auto ${["timeline", "map", "world"].includes(viewType) ? "" : "p-6"}`}
      >
        {viewType === "grid" && (
          <GridView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={filteredNodes}
            searchQuery={search}
          />
        )}
        {viewType === "outline" && (
          <OutlineView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={filteredNodes}
            searchQuery={search}
          />
        )}
        {viewType === "matrix" && (
          <MatrixView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={filteredNodes}
            searchQuery={search}
          />
        )}
        {viewType === "timeline" && (
          <TimelineView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={filteredNodes}
            searchQuery={search}
          />
        )}
        {viewType === "map" && (
          <MapView projectId={projectId} seriesId={project.seriesId} />
        )}
        {viewType === "world" && (
          <WorldTimelineView
            projectId={projectId}
            seriesId={project.seriesId}
          />
        )}
      </div>
    </div>
  );
}
