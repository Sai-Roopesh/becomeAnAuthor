"use client";

import {
  CodexCategory,
  DocumentNode,
  SceneCodexLinkRole,
} from "@/domain/entities/types";
import { invalidateQueries, useLiveQuery } from "@/hooks/use-live-query";
import { useCodexRepository } from "@/hooks/use-codex-repository";
import { useMemo, useState } from "react";
import { Table, User, MapPin, Scroll, Sparkles, BookOpen } from "lucide-react";
import { useAppServices } from "@/infrastructure/di/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MatrixViewProps {
  projectId: string;
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

const ROLE_OPTIONS: Array<{ value: SceneCodexLinkRole; label: string }> = [
  { value: "appears", label: "Appears" },
  { value: "mentioned", label: "Mentioned" },
  { value: "pov", label: "POV" },
  { value: "location", label: "Setting" },
  { value: "plot", label: "Plot" },
];

function defaultRoleForCategory(category: CodexCategory): SceneCodexLinkRole {
  if (category === "character") return "appears";
  if (category === "location") return "location";
  if (category === "subplot") return "plot";
  return "mentioned";
}

function roleOptionsForCategory(category: CodexCategory): SceneCodexLinkRole[] {
  if (category === "character") return ["appears", "mentioned", "pov"];
  if (category === "location") return ["location", "mentioned", "appears"];
  if (category === "subplot") return ["plot", "mentioned", "appears"];
  return ["mentioned", "appears"];
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

export function MatrixView({ projectId, seriesId, nodes }: MatrixViewProps) {
  const [activeCategory, setActiveCategory] =
    useState<CodexCategory>("character");
  const [entrySearch, setEntrySearch] = useState("");
  const [linkedOnly, setLinkedOnly] = useState(false);

  const codexRepo = useCodexRepository();
  const { sceneCodexLinkRepository: linkRepo } = useAppServices();

  const codexEntries = useLiveQuery(
    () => codexRepo.getBySeries(seriesId),
    [seriesId, codexRepo],
  );

  const links = useLiveQuery(
    () => linkRepo.getByProject(projectId),
    [projectId, linkRepo],
  );

  const scenes = useMemo(() => getScenes(nodes), [nodes]);

  const categoryEntries = useMemo(() => {
    const query = entrySearch.trim().toLowerCase();
    const entries = (codexEntries ?? [])
      .filter((entry) => entry.category === activeCategory)
      .filter((entry) => {
        if (!query) return true;
        const blob = [entry.name, ...(entry.aliases ?? [])]
          .join(" ")
          .toLowerCase();
        return blob.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!linkedOnly || !links) return entries;

    const linkedIds = new Set(links.map((link) => link.codexId));
    return entries.filter((entry) => linkedIds.has(entry.id));
  }, [codexEntries, activeCategory, entrySearch, linkedOnly, links]);

  const linkMap = useMemo(() => {
    const map = new Map<string, { id: string; role: SceneCodexLinkRole }>();
    for (const link of links ?? []) {
      map.set(`${link.sceneId}:${link.codexId}`, {
        id: link.id,
        role: link.role,
      });
    }
    return map;
  }, [links]);

  const getLink = (sceneId: string, codexId: string) =>
    linkMap.get(`${sceneId}:${codexId}`);

  const toggleLink = async (
    sceneId: string,
    codexId: string,
    category: CodexCategory,
  ) => {
    const existing = getLink(sceneId, codexId);

    if (existing) {
      await linkRepo.delete(existing.id);
    } else {
      await linkRepo.create({
        sceneId,
        codexId,
        projectId,
        role: defaultRoleForCategory(category),
      });
    }

    invalidateQueries();
  };

  const updateRole = async (
    sceneId: string,
    codexId: string,
    role: SceneCodexLinkRole,
  ) => {
    const existing = getLink(sceneId, codexId);
    if (!existing) return;
    await linkRepo.update(existing.id, { role });
    invalidateQueries();
  };

  const totalActiveLinks = useMemo(() => {
    const entryIds = new Set(categoryEntries.map((entry) => entry.id));
    return (links ?? []).filter((link) => entryIds.has(link.codexId)).length;
  }, [links, categoryEntries]);

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
            Create scenes to map which codex entities appear where.
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
              variant={linkedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setLinkedOnly((prev) => !prev)}
            >
              {linkedOnly ? "Showing Linked" : "Show Linked Only"}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{scenes.length} scenes</Badge>
            <Badge variant="outline">{categoryEntries.length} entries</Badge>
            <Badge variant="outline">{totalActiveLinks} links</Badge>
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
                {categoryEntries.map((entry) => (
                  <th
                    key={entry.id}
                    className="p-3 text-center font-medium text-muted-foreground border-r border-border/50 min-w-[190px] max-w-[230px]"
                  >
                    <div className="truncate" title={entry.name}>
                      {entry.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {scenes.map((scene) => (
                <tr
                  key={scene.id}
                  className="group hover:bg-muted/25 transition-colors"
                >
                  <td className="p-4 border-r border-border/50 font-medium text-foreground sticky left-0 bg-background/95 group-hover:bg-muted/95 transition-colors backdrop-blur z-10">
                    {scene.title}
                  </td>
                  {categoryEntries.map((entry) => {
                    const link = getLink(scene.id, entry.id);
                    const allowedRoles = roleOptionsForCategory(entry.category);

                    return (
                      <td
                        key={entry.id}
                        className="p-2 border-r border-border/50 align-top"
                      >
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            className={`h-8 rounded-md border text-xs font-medium transition-colors ${
                              link
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/60 bg-background hover:bg-muted"
                            }`}
                            onClick={() =>
                              void toggleLink(
                                scene.id,
                                entry.id,
                                entry.category,
                              )
                            }
                          >
                            {link
                              ? `Linked: ${ROLE_OPTIONS.find((r) => r.value === link.role)?.label ?? link.role}`
                              : "Add Link"}
                          </button>

                          {link && (
                            <Select
                              value={link.role}
                              onValueChange={(value) =>
                                void updateRole(
                                  scene.id,
                                  entry.id,
                                  value as SceneCodexLinkRole,
                                )
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.filter((option) =>
                                  allowedRoles.includes(option.value),
                                ).map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
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
            Add codex entries to map their appearance across scenes.
          </p>
        </div>
      )}
    </div>
  );
}
