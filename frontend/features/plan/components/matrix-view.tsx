"use client";

import { CodexCategory, DocumentNode } from "@/domain/entities/types";
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

function buildDetector(term: string): RegExp | null {
  const cleaned = term.trim();
  if (!cleaned) return null;

  // Use word boundaries for regular terms and a looser boundary for punctuation-heavy terms.
  const escaped = escapeRegExp(cleaned);
  const hasWordChar = /[A-Za-z0-9]/.test(cleaned);

  if (hasWordChar) {
    return new RegExp(`\\b${escaped}\\b`, "i");
  }

  return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i");
}

function sceneSearchBlob(scene: DocumentNode): string {
  if (scene.type !== "scene") return scene.title.toLowerCase();

  const contentText = extractTextFromContent(scene.content).toLowerCase();
  const summary = (scene.summary ?? "").toLowerCase();
  const pov = (scene.pov ?? "").toLowerCase();
  const labels = (scene.labels ?? []).join(" ").toLowerCase();

  return [scene.title, summary, pov, labels, contentText]
    .join(" ")
    .toLowerCase();
}

function getScenes(nodes: DocumentNode[]): DocumentNode[] {
  const acts = nodes
    .filter((n) => n.type === "act")
    .sort((a, b) => a.order - b.order);

  const chapters = nodes.filter((n) => n.type === "chapter");
  const scenes = nodes.filter((n) => n.type === "scene");

  const orderedScenes: DocumentNode[] = [];

  for (const act of acts) {
    const actChapters = chapters
      .filter((chapter) => chapter.parentId === act.id)
      .sort((a, b) => a.order - b.order);

    for (const chapter of actChapters) {
      const chapterScenes = scenes
        .filter((scene) => scene.parentId === chapter.id)
        .sort((a, b) => a.order - b.order);
      orderedScenes.push(...chapterScenes);
    }
  }

  return orderedScenes;
}

export function MatrixView({ seriesId, nodes }: MatrixViewProps) {
  const [activeCategory, setActiveCategory] =
    useState<CodexCategory>("character");
  const [entrySearch, setEntrySearch] = useState("");

  const codexRepo = useCodexRepository();

  const codexEntries = useLiveQuery(
    () => codexRepo.getBySeries(seriesId),
    [seriesId, codexRepo],
  );

  const scenes = useMemo(() => getScenes(nodes), [nodes]);

  const sceneBlobMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const scene of scenes) {
      map.set(scene.id, sceneSearchBlob(scene));
    }
    return map;
  }, [scenes]);

  const categoryEntries = useMemo(() => {
    const query = entrySearch.trim().toLowerCase();
    return (codexEntries ?? [])
      .filter((entry) => entry.category === activeCategory)
      .filter((entry) => {
        if (!query) return true;
        const blob = [entry.name, ...(entry.aliases ?? [])]
          .join(" ")
          .toLowerCase();
        return blob.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [codexEntries, activeCategory, entrySearch]);

  const detectionMap = useMemo(() => {
    const map = new Map<string, boolean>();

    for (const scene of scenes) {
      const blob = sceneBlobMap.get(scene.id) ?? "";

      for (const entry of categoryEntries) {
        const terms = [entry.name, ...(entry.aliases ?? [])]
          .map((term) => term.trim())
          .filter(Boolean);

        const detected = terms.some((term) => {
          const detector = buildDetector(term);
          return detector ? detector.test(blob) : false;
        });

        map.set(`${scene.id}:${entry.id}`, detected);
      }
    }

    return map;
  }, [scenes, categoryEntries, sceneBlobMap]);

  const filteredScenes = useMemo(() => {
    if (categoryEntries.length === 0) return scenes;

    return scenes.filter((scene) =>
      categoryEntries.some((entry) =>
        detectionMap.get(`${scene.id}:${entry.id}`),
      ),
    );
  }, [scenes, categoryEntries, detectionMap]);

  const filteredEntries = useMemo(() => {
    if (filteredScenes.length === 0) return categoryEntries;

    return categoryEntries.filter((entry) =>
      filteredScenes.some((scene) =>
        detectionMap.get(`${scene.id}:${entry.id}`),
      ),
    );
  }, [categoryEntries, filteredScenes, detectionMap]);

  const totalDetections = useMemo(() => {
    let total = 0;
    for (const scene of filteredScenes) {
      for (const entry of filteredEntries) {
        if (detectionMap.get(`${scene.id}:${entry.id}`)) total += 1;
      }
    }
    return total;
  }, [filteredScenes, filteredEntries, detectionMap]);

  if (scenes.length === 0) {
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
          <Input
            value={entrySearch}
            onChange={(e) => setEntrySearch(e.target.value)}
            placeholder={`Search ${CATEGORY_META.find((c) => c.id === activeCategory)?.label.toLowerCase()}...`}
            className="w-56 h-8"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{filteredScenes.length} scenes</Badge>
            <Badge variant="outline">{filteredEntries.length} entries</Badge>
            <Badge variant="outline">{totalDetections} detections</Badge>
          </div>
        </div>
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-card/30 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-left font-heading font-semibold text-foreground border-r border-border/50 min-w-table-lg sticky left-0 bg-muted/95 backdrop-blur z-20">
                  Scene
                </th>
                {filteredEntries.map((entry) => (
                  <th
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
              {filteredScenes.map((scene) => (
                <tr
                  key={scene.id}
                  className="group hover:bg-muted/25 transition-colors"
                >
                  <td className="p-4 border-r border-border/50 font-medium text-foreground sticky left-0 bg-background/95 group-hover:bg-muted/95 transition-colors backdrop-blur z-10">
                    {scene.title}
                  </td>
                  {filteredEntries.map((entry) => {
                    const detected = detectionMap.get(
                      `${scene.id}:${entry.id}`,
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

      {(categoryEntries.length === 0 || filteredEntries.length === 0) && (
        <div className="text-center p-8 border-2 border-dashed border-border/30 rounded-xl bg-muted/5">
          <p className="text-muted-foreground mb-2">
            No auto-detected{" "}
            {CATEGORY_META.find(
              (c) => c.id === activeCategory,
            )?.label.toLowerCase()}{" "}
            found
          </p>
          <p className="text-xs text-muted-foreground/70">
            Detection matches codex names and aliases against scene title,
            summary, POV, labels, and content.
          </p>
        </div>
      )}
    </div>
  );
}
