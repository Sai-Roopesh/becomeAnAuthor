"use client";

import {
  Act,
  Chapter,
  CodexCategory,
  DocumentNode,
  Scene,
} from "@/domain/entities/types";
import { useCodexRepository } from "@/hooks/use-codex-repository";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useMemo, useState } from "react";
import { Table, User, MapPin, Scroll, Sparkles, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractTextFromContent } from "@/shared/utils/editor";

interface MatrixViewProps {
  seriesId: string;
  nodes: DocumentNode[];
}

interface SceneRow {
  scene: Scene;
  chapterTitle: string;
  chapterId: string;
  actTitle: string;
  actId: string;
}

const CATEGORY_META: Array<{
  id: CodexCategory;
  label: string;
  icon: typeof User;
}> = [
  { id: "character", label: "Characters", icon: User },
  { id: "location", label: "Locations", icon: MapPin },
  { id: "subplot", label: "Subplots", icon: Scroll },
  { id: "item", label: "Items", icon: Sparkles },
  { id: "lore", label: "Lore", icon: BookOpen },
];

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForDetection(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDetector(term: string): RegExp | null {
  const normalized = normalizeForDetection(term);
  if (!normalized) return null;

  return new RegExp(`(^|\\s)${escapeRegExp(normalized)}(?=\\s|$)`, "i");
}

function sceneSearchBlob(scene: Scene): string {
  const contentText = extractTextFromContent(scene.content);
  const summary = scene.summary ?? "";
  const pov = scene.pov ?? "";
  const labels = (scene.labels ?? []).join(" ");

  return normalizeForDetection(
    [scene.title, summary, pov, labels, contentText].join(" "),
  );
}

function buildSceneRows(nodes: DocumentNode[]): SceneRow[] {
  const acts = nodes
    .filter((node): node is Act => node.type === "act")
    .sort((a, b) => a.order - b.order);

  const chapters = nodes.filter(
    (node): node is Chapter => node.type === "chapter",
  );
  const scenes = nodes.filter((node): node is Scene => node.type === "scene");

  const rows: SceneRow[] = [];

  for (const act of acts) {
    const actChapters = chapters
      .filter((chapter) => chapter.parentId === act.id)
      .sort((a, b) => a.order - b.order);

    for (const chapter of actChapters) {
      const chapterScenes = scenes
        .filter((scene) => scene.parentId === chapter.id)
        .sort((a, b) => a.order - b.order);

      for (const scene of chapterScenes) {
        rows.push({
          scene,
          chapterTitle: chapter.title,
          chapterId: chapter.id,
          actTitle: act.title,
          actId: act.id,
        });
      }
    }
  }

  return rows;
}

function computeRowSpans(
  rows: SceneRow[],
  getGroupKey: (row: SceneRow) => string,
): number[] {
  const spans = new Array(rows.length).fill(0);
  let index = 0;

  while (index < rows.length) {
    const currentKey = getGroupKey(rows[index]!);
    let end = index + 1;

    while (end < rows.length && getGroupKey(rows[end]!) === currentKey) {
      end += 1;
    }

    spans[index] = end - index;
    index = end;
  }

  return spans;
}

export function MatrixView({ seriesId, nodes }: MatrixViewProps) {
  const [activeCategory, setActiveCategory] =
    useState<CodexCategory>("character");
  const [entrySearch, setEntrySearch] = useState("");
  const [detectedOnlyEntries, setDetectedOnlyEntries] = useState(false);

  const codexRepo = useCodexRepository();

  const codexEntries = useLiveQuery(
    () => codexRepo.getBySeries(seriesId),
    [seriesId, codexRepo],
  );

  const sceneRows = useMemo(() => buildSceneRows(nodes), [nodes]);

  const actRowSpans = useMemo(
    () => computeRowSpans(sceneRows, (row) => row.actId),
    [sceneRows],
  );

  const chapterRowSpans = useMemo(
    () => computeRowSpans(sceneRows, (row) => `${row.actId}:${row.chapterId}`),
    [sceneRows],
  );

  const sceneBlobMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of sceneRows) {
      map.set(row.scene.id, sceneSearchBlob(row.scene));
    }
    return map;
  }, [sceneRows]);

  const categoryEntries = useMemo(() => {
    const query = entrySearch.trim().toLowerCase();

    return (codexEntries ?? [])
      .filter((entry) => entry.category === activeCategory)
      .filter((entry) => {
        if (!query) return true;
        const searchable = [entry.name, ...(entry.aliases ?? [])]
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [codexEntries, activeCategory, entrySearch]);

  const detectionMap = useMemo(() => {
    const map = new Map<string, boolean>();

    for (const row of sceneRows) {
      const blob = sceneBlobMap.get(row.scene.id) ?? "";

      for (const entry of categoryEntries) {
        const terms = [entry.name, ...(entry.aliases ?? [])]
          .map((term) => term.trim())
          .filter(Boolean);

        const detected = terms.some((term) => {
          const detector = buildDetector(term);
          return detector ? detector.test(blob) : false;
        });

        map.set(`${row.scene.id}:${entry.id}`, detected);
      }
    }

    return map;
  }, [sceneRows, categoryEntries, sceneBlobMap]);

  const visibleEntries = useMemo(() => {
    if (!detectedOnlyEntries) return categoryEntries;

    return categoryEntries.filter((entry) =>
      sceneRows.some((row) => detectionMap.get(`${row.scene.id}:${entry.id}`)),
    );
  }, [categoryEntries, sceneRows, detectionMap, detectedOnlyEntries]);

  const detectedSceneCount = useMemo(() => {
    if (visibleEntries.length === 0) return 0;

    return sceneRows.filter((row) =>
      visibleEntries.some((entry) =>
        detectionMap.get(`${row.scene.id}:${entry.id}`),
      ),
    ).length;
  }, [sceneRows, visibleEntries, detectionMap]);

  const totalDetections = useMemo(() => {
    let total = 0;
    for (const row of sceneRows) {
      for (const entry of visibleEntries) {
        if (detectionMap.get(`${row.scene.id}:${entry.id}`)) {
          total += 1;
        }
      }
    }
    return total;
  }, [sceneRows, visibleEntries, detectionMap]);

  if (sceneRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <div className="relative bg-background p-6 rounded-full shadow-xl border border-border/50">
            <Table className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-heading font-bold">
            Entity Coverage Matrix
          </h3>
          <p className="text-muted-foreground max-w-sm">
            Create scenes to auto-detect codex entities in context.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-lg border border-border/50 bg-card/50 p-3 backdrop-blur-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_META.map((category) => {
            const Icon = category.icon;
            const active = category.id === activeCategory;
            return (
              <Button
                key={category.id}
                variant={active ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setActiveCategory(category.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {category.label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              value={entrySearch}
              onChange={(e) => setEntrySearch(e.target.value)}
              placeholder={`Search ${CATEGORY_META.find((c) => c.id === activeCategory)?.label.toLowerCase()}...`}
              className="w-56 h-8"
            />
            <Button
              variant={detectedOnlyEntries ? "default" : "outline"}
              size="sm"
              onClick={() => setDetectedOnlyEntries((prev) => !prev)}
            >
              {detectedOnlyEntries ? "Detected Entries" : "All Entries"}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{sceneRows.length} scenes</Badge>
            <Badge variant="outline">
              {visibleEntries.length}/{categoryEntries.length} entries
            </Badge>
            <Badge variant="outline">
              {detectedSceneCount} detected scenes
            </Badge>
            <Badge variant="outline">{totalDetections} detections</Badge>
          </div>
        </div>
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-card/30 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Matrix of scenes and auto-detected codex entries
            </caption>
            <thead className="bg-muted/50 border-b border-border/50 sticky top-0 z-10">
              <tr>
                <th
                  scope="col"
                  className="p-4 text-left font-heading font-semibold text-foreground border-r border-border/50 min-w-[180px]"
                >
                  Act
                </th>
                <th
                  scope="col"
                  className="p-4 text-left font-heading font-semibold text-foreground border-r border-border/50 min-w-[220px]"
                >
                  Chapter
                </th>
                <th
                  scope="col"
                  className="p-4 text-left font-heading font-semibold text-foreground border-r border-border/50 min-w-[280px]"
                >
                  Scene
                </th>
                {visibleEntries.map((entry) => (
                  <th
                    scope="col"
                    key={entry.id}
                    className="p-3 text-center font-medium text-muted-foreground border-r border-border/50 min-w-[170px] max-w-[220px]"
                  >
                    <div className="truncate" title={entry.name}>
                      {entry.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sceneRows.map((row, index) => (
                <tr
                  key={row.scene.id}
                  className="group hover:bg-muted/25 transition-colors"
                >
                  {actRowSpans[index] > 0 && (
                    <th
                      scope="rowgroup"
                      rowSpan={actRowSpans[index]}
                      className="p-4 border-r border-border/50 text-foreground align-top font-medium"
                    >
                      {row.actTitle}
                    </th>
                  )}

                  {chapterRowSpans[index] > 0 && (
                    <th
                      scope="rowgroup"
                      rowSpan={chapterRowSpans[index]}
                      className="p-4 border-r border-border/50 text-foreground align-top font-medium"
                    >
                      {row.chapterTitle}
                    </th>
                  )}

                  <th
                    scope="row"
                    className="p-4 border-r border-border/50 text-left font-medium text-foreground"
                  >
                    {row.scene.title}
                  </th>

                  {visibleEntries.map((entry) => {
                    const detected = detectionMap.get(
                      `${row.scene.id}:${entry.id}`,
                    );

                    return (
                      <td
                        key={entry.id}
                        className="p-3 border-r border-border/50 text-center"
                      >
                        {detected ? (
                          <span className="inline-flex items-center justify-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium">
                            Detected
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">
                            -
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {categoryEntries.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
          <p className="text-muted-foreground mb-2">
            No{" "}
            {CATEGORY_META.find(
              (c) => c.id === activeCategory,
            )?.label.toLowerCase()}{" "}
            found
          </p>
          <p className="text-xs text-muted-foreground/70">
            Detection uses codex names and aliases against scene content.
          </p>
        </div>
      )}
    </div>
  );
}
