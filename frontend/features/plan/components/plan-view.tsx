"use client";

import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import type {
  Act,
  Chapter,
  CodexCategory,
  DocumentNode,
  Scene,
} from "@/domain/entities/types";
import { useMemo, useState } from "react";
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

const PLAN_TABS: Array<{
  id: PlanViewType;
  label: string;
  description: string;
}> = [
  {
    id: "grid",
    label: "Grid",
    description: "Visual structure of acts, chapters, and scene cards.",
  },
  {
    id: "outline",
    label: "Outline",
    description: "Linear narrative outline for quick story review.",
  },
  {
    id: "matrix",
    label: "Matrix",
    description: "Track which codex entities appear in each scene.",
  },
  {
    id: "timeline",
    label: "Timeline",
    description: "Follow entity presence and flow scene-by-scene.",
  },
  {
    id: "map",
    label: "Map",
    description: "Manage world maps and location markers.",
  },
  {
    id: "world",
    label: "World",
    description: "Track world-history events separate from scene flow.",
  },
];

function includesText(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

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

  const isSceneBasedView =
    viewType === "grid" ||
    viewType === "outline" ||
    viewType === "matrix" ||
    viewType === "timeline";

  const project = useLiveQuery(
    () => projectRepo.get(projectId),
    [projectId, projectRepo],
  );
  const nodes = useLiveQuery(
    () => nodeRepo.getByProject(projectId),
    [projectId, nodeRepo],
  );

  const allLinks = useLiveQuery(
    () => linkRepo.getByProject(projectId),
    [projectId, linkRepo],
  );

  const codexEntries = useLiveQuery(
    () =>
      project ? codexRepo.getBySeries(project.seriesId) : Promise.resolve([]),
    [project?.seriesId, codexRepo],
  );

  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    if (!isSceneBasedView) return nodes;

    const query = search.trim().toLowerCase();
    const hasTextFilter = query.length > 0;

    const acts = sortByOrder(nodes.filter((n): n is Act => n.type === "act"));

    const chaptersByAct = new Map<string, Chapter[]>();
    const scenesByChapter = new Map<string, Scene[]>();

    for (const node of nodes) {
      if (node.type === "chapter") {
        const existing = chaptersByAct.get(node.parentId ?? "") ?? [];
        existing.push(node);
        chaptersByAct.set(node.parentId ?? "", existing);
      }

      if (node.type === "scene") {
        const existing = scenesByChapter.get(node.parentId ?? "") ?? [];
        existing.push(node);
        scenesByChapter.set(node.parentId ?? "", existing);
      }
    }

    for (const [actId, chapterList] of chaptersByAct.entries()) {
      chaptersByAct.set(actId, sortByOrder(chapterList));
    }

    for (const [chapterId, sceneList] of scenesByChapter.entries()) {
      scenesByChapter.set(chapterId, sortByOrder(sceneList));
    }

    const categoryCodexIds = new Set(
      codexEntries
        ?.filter((entry) =>
          categoryFilter ? entry.category === categoryFilter : true,
        )
        .map((entry) => entry.id) ?? [],
    );

    const linksByScene = new Map<string, Array<{ codexId: string }>>();
    for (const link of allLinks ?? []) {
      const existing = linksByScene.get(link.sceneId) ?? [];
      existing.push({ codexId: link.codexId });
      linksByScene.set(link.sceneId, existing);
    }

    const codexById = new Map(
      (codexEntries ?? []).map((entry) => [entry.id, entry]),
    );

    const scenePassesCodexFilters = (scene: Scene): boolean => {
      const sceneLinks = linksByScene.get(scene.id) ?? [];

      if (selectedCodexIds.length > 0) {
        const hasSelected = sceneLinks.some((link) =>
          selectedCodexIds.includes(link.codexId),
        );
        if (!hasSelected) return false;
      }

      if (categoryFilter) {
        const hasCategory = sceneLinks.some((link) =>
          categoryCodexIds.has(link.codexId),
        );
        if (!hasCategory) return false;
      }

      return true;
    };

    const sceneMatchesText = (scene: Scene): boolean => {
      if (!hasTextFilter) return true;

      const baseText = [
        scene.title,
        scene.summary ?? "",
        scene.pov ?? "",
        ...(scene.labels ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (includesText(baseText, query)) return true;

      const linkedNames = (linksByScene.get(scene.id) ?? [])
        .map((link) => codexById.get(link.codexId))
        .filter(Boolean)
        .flatMap((entry) => [entry!.name, ...(entry!.aliases ?? [])])
        .join(" ")
        .toLowerCase();

      return includesText(linkedNames, query);
    };

    const result: DocumentNode[] = [];

    for (const act of acts) {
      const actTitleMatch = hasTextFilter
        ? includesText(act.title.toLowerCase(), query)
        : false;

      const visibleChapters: Chapter[] = [];
      const visibleScenesByChapter = new Map<string, Scene[]>();

      for (const chapter of chaptersByAct.get(act.id) ?? []) {
        const chapterTitleMatch = hasTextFilter
          ? includesText(chapter.title.toLowerCase(), query)
          : false;

        const visibleScenes = (scenesByChapter.get(chapter.id) ?? []).filter(
          (scene) => {
            if (!scenePassesCodexFilters(scene)) return false;
            if (!hasTextFilter) return true;
            if (actTitleMatch || chapterTitleMatch) return true;
            return sceneMatchesText(scene);
          },
        );

        if (visibleScenes.length > 0) {
          visibleChapters.push(chapter);
          visibleScenesByChapter.set(chapter.id, visibleScenes);
        }
      }

      if (visibleChapters.length === 0) {
        continue;
      }

      result.push(act);
      for (const chapter of visibleChapters) {
        result.push(chapter);
        for (const scene of visibleScenesByChapter.get(chapter.id) ?? []) {
          result.push(scene);
        }
      }
    }

    return result;
  }, [
    nodes,
    isSceneBasedView,
    search,
    selectedCodexIds,
    categoryFilter,
    codexEntries,
    allLinks,
  ]);

  if (!project || !nodes) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const activeFilterCount =
    selectedCodexIds.length + (categoryFilter !== null ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const activeTab = PLAN_TABS.find((tab) => tab.id === viewType)!;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex p-1 bg-muted/50 rounded-lg border border-border/50 shadow-inner overflow-x-auto whitespace-nowrap">
            {(PLAN_TABS.map((tab) => tab.id) as PlanViewType[]).map((type) => (
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
                <span>{PLAN_TABS.find((tab) => tab.id === type)?.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 w-full max-w-md relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={
                isSceneBasedView
                  ? "Search scenes, summaries, POV, labels, and linked codex entries..."
                  : "Search is available in Grid, Outline, Matrix, and Timeline"
              }
              value={search}
              disabled={!isSceneBasedView}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50 focus:bg-background transition-all disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              className="gap-2"
              disabled={!isSceneBasedView}
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
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground">
            {activeTab.description}
          </p>
        </div>

        {isSceneBasedView && showFilters && (
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

      <div
        className={`flex-1 overflow-auto ${["timeline", "map", "world"].includes(viewType) ? "" : "p-6"}`}
      >
        {viewType === "grid" && (
          <GridView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={filteredNodes}
          />
        )}
        {viewType === "outline" && (
          <OutlineView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={filteredNodes}
          />
        )}
        {viewType === "matrix" && (
          <MatrixView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={nodes}
          />
        )}
        {viewType === "timeline" && (
          <TimelineView
            projectId={projectId}
            seriesId={project.seriesId}
            nodes={filteredNodes}
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
