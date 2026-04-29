"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { useProjectStore } from "@/store/use-project-store";
import type {
  CodexCategory,
  CodexEntry,
  SceneCodexLinkRole,
} from "@/domain/entities/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  User,
  MapPin,
  Scroll,
  BookOpen,
  Sparkles,
  Plus,
  X,
  Link2,
  Check,
  Lightbulb,
  Info,
  Loader2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import type { TiptapContent } from "@/shared/types/tiptap";
import {
  extractSceneTextForIntelligence,
  getSceneSectionWarnings,
} from "@/shared/utils/scene-sections";

interface SceneLinkPanelProps {
  sceneId: string;
  projectId: string;
  seriesId: string; // Required - series-first architecture
  /** Trigger element (optional if using controlled mode) */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void;
}

// Category configuration
const CATEGORY_CONFIG: Record<
  CodexCategory,
  { icon: typeof User; label: string; color: string }
> = {
  character: {
    icon: User,
    label: "Characters",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  },
  location: {
    icon: MapPin,
    label: "Locations",
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
  },
  subplot: {
    icon: Scroll,
    label: "Plot Threads",
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  },
  item: {
    icon: Sparkles,
    label: "Items",
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  },
  lore: {
    icon: BookOpen,
    label: "Lore",
    color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30",
  },
};

const ROLE_OPTIONS: { value: SceneCodexLinkRole; label: string }[] = [
  { value: "appears", label: "Appears" },
  { value: "mentioned", label: "Mentioned" },
  { value: "pov", label: "POV Character" },
  { value: "location", label: "Setting" },
  { value: "plot", label: "Plot Thread" },
];

function getDefaultRoleForCategory(
  category: CodexCategory,
): SceneCodexLinkRole {
  switch (category) {
    case "character":
      return "appears";
    case "location":
      return "location";
    case "subplot":
      return "plot";
    default:
      return "mentioned";
  }
}

function getErrorDescription(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Please try again.";
}

function parseSceneContent(content: unknown): unknown {
  if (!content) return null;

  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  if (typeof content === "object") {
    return content;
  }

  return null;
}

function extractSceneText(content: unknown): string {
  const parsedContent = parseSceneContent(content);
  if (!parsedContent || typeof parsedContent !== "object") return "";
  if (!("type" in parsedContent) || parsedContent.type !== "doc") return "";
  return extractSceneTextForIntelligence(
    parsedContent as TiptapContent,
  ).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWholeWordMatch(text: string, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i");
  return pattern.test(text);
}

/**
 * Side panel for linking codex entries to a scene
 * Allows adding/removing links with role specification
 * Series-first: uses seriesId for codex lookups
 */
export function SceneLinkPanel({
  sceneId,
  projectId,
  seriesId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SceneLinkPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const [pendingCodexIds, setPendingCodexIds] = useState<string[]>([]);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setInternalOpen;

  const {
    sceneCodexLinkRepository: linkRepo,
    codexRepository: codexRepo,
    nodeRepository: nodeRepo,
  } = useAppServices();

  const { setViewMode, setLeftSidebarTab, setShowSidebar } = useProjectStore();

  const sceneNode = useLiveQuery(
    () => nodeRepo.get(sceneId),
    [sceneId, nodeRepo],
    { keys: "nodes" },
  );

  // Get all codex entries (series-level)
  const entries = useLiveQuery(
    () => codexRepo.getBySeries(seriesId),
    [seriesId, codexRepo],
    { keys: "codex" },
  );

  // Get existing links for this scene
  const links = useLiveQuery(
    () => linkRepo.getByScene(sceneId),
    [sceneId, linkRepo],
    { keys: "scene-codex-links" },
  );

  const linkedCodexIds = useMemo(
    () => new Set((links ?? []).map((link) => link.codexId)),
    [links],
  );

  const sceneContext = useMemo(() => {
    if (!sceneNode || sceneNode.type !== "scene") {
      return "";
    }

    const labels = Array.isArray(sceneNode.labels) ? sceneNode.labels : [];
    return [
      sceneNode.title,
      sceneNode.summary ?? "",
      sceneNode.pov ?? "",
      ...labels,
    ]
      .join(" ")
      .toLowerCase();
  }, [sceneNode]);

  const sceneBodyText = useMemo(() => {
    if (!sceneNode || sceneNode.type !== "scene") {
      return "";
    }
    return extractSceneText(sceneNode.content);
  }, [sceneNode]);

  const unlinkedMentionCandidates = useMemo(() => {
    if (!entries || !sceneBodyText) {
      return [] as Array<{ entry: CodexEntry; matchedTerms: string[] }>;
    }

    return entries
      .filter((entry) => !linkedCodexIds.has(entry.id))
      .map((entry) => {
        const matchedTerms = [entry.name, ...entry.aliases].filter((term) =>
          hasWholeWordMatch(sceneBodyText, term),
        );
        return { entry, matchedTerms };
      })
      .filter((candidate) => candidate.matchedTerms.length > 0)
      .sort(
        (a, b) =>
          b.matchedTerms.length - a.matchedTerms.length ||
          a.entry.name.localeCompare(b.entry.name),
      );
  }, [entries, linkedCodexIds, sceneBodyText]);

  const recommendedEntries = useMemo(() => {
    if (!entries || entries.length === 0 || !sceneContext) {
      return [];
    }

    const context = ` ${sceneContext} `;
    const povText =
      sceneNode && sceneNode.type === "scene" && sceneNode.pov
        ? sceneNode.pov.trim().toLowerCase()
        : null;

    return entries
      .filter((entry) => !linkedCodexIds.has(entry.id))
      .map((entry) => {
        const terms = [entry.name, ...entry.aliases]
          .map((term) => term.trim().toLowerCase())
          .filter((term) => term.length > 0);

        let score = 0;
        for (const term of terms) {
          if (context.includes(` ${term} `) || context.includes(term)) {
            score += term === entry.name.toLowerCase() ? 4 : 2;
          }
        }

        if (
          povText &&
          (entry.name.toLowerCase() === povText ||
            entry.aliases.some((alias) => alias.toLowerCase() === povText))
        ) {
          score += 5;
        }

        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name),
      )
      .slice(0, 6)
      .map((item) => item.entry);
  }, [entries, linkedCodexIds, sceneContext, sceneNode]);

  // Filter entries by search
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!searchQuery) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.aliases.some((a) => a.toLowerCase().includes(query)),
    );
  }, [entries, searchQuery]);

  // Group by category
  const groupedEntries = useMemo(() => {
    const groups: Record<CodexCategory, CodexEntry[]> = {
      character: [],
      location: [],
      subplot: [],
      item: [],
      lore: [],
    };
    filteredEntries.forEach((e) => groups[e.category].push(e));
    return groups;
  }, [filteredEntries]);

  // Check if entry is linked
  const isLinked = (codexId: string) => linkedCodexIds.has(codexId);
  const getLink = (codexId: string) =>
    links?.find((l) => l.codexId === codexId);

  const isPending = (codexId: string) => pendingCodexIds.includes(codexId);

  const markPending = (codexId: string) => {
    setPendingCodexIds((current) =>
      current.includes(codexId) ? current : [...current, codexId],
    );
  };

  const clearPending = (codexId: string) => {
    setPendingCodexIds((current) => current.filter((id) => id !== codexId));
  };

  const navigateToCodex = () => {
    setViewMode("write");
    setLeftSidebarTab("codex");
    setShowSidebar(true);
    setOpen(false);
  };

  const searchInputId = `scene-link-search-${sceneId}`;

  const focusSearchInput = useCallback(() => {
    const input = document.getElementById(searchInputId);
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  }, [searchInputId]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      const key = event.key.toLowerCase();
      if (key === "f") {
        event.preventDefault();
        focusSearchInput();
        return;
      }

      if (event.shiftKey && key === "l") {
        event.preventDefault();
        focusSearchInput();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusSearchInput, open]);

  // Toggle link
  const toggleLink = async (entry: CodexEntry) => {
    if (isPending(entry.id)) return;

    markPending(entry.id);
    const existingLink = getLink(entry.id);

    try {
      if (existingLink) {
        await linkRepo.delete(existingLink.id);
        toast.success(`Unlinked ${entry.name}`);
      } else {
        await linkRepo.create({
          sceneId,
          codexId: entry.id,
          projectId,
          role: getDefaultRoleForCategory(entry.category),
        });
        toast.success(`Linked ${entry.name}`);
      }
    } catch (error) {
      toast.error(
        existingLink
          ? `Failed to unlink ${entry.name}`
          : `Failed to link ${entry.name}`,
        {
          description: getErrorDescription(error),
        },
      );
    } finally {
      clearPending(entry.id);
    }
  };

  // Update role
  const updateRole = async (codexId: string, role: SceneCodexLinkRole) => {
    if (isPending(codexId)) return;

    const link = getLink(codexId);
    if (!link) return;

    markPending(codexId);
    try {
      await linkRepo.update(link.id, { role });
      toast.success("Role updated");
    } catch (error) {
      toast.error("Failed to update role", {
        description: getErrorDescription(error),
      });
    } finally {
      clearPending(codexId);
    }
  };

  // Get linked entries grouped by category
  const linkedEntries = useMemo(() => {
    if (!entries || !links) return [];

    const entryById = new Map(entries.map((entry) => [entry.id, entry]));
    return links.flatMap((link) => {
      const entry = entryById.get(link.codexId);
      return entry ? [{ link, entry }] : [];
    });
  }, [entries, links]);

  const consistencyWarnings = useMemo(() => {
    if (!sceneNode || sceneNode.type !== "scene") {
      return [] as string[];
    }

    const warnings: string[] = [];
    warnings.push(...getSceneSectionWarnings(sceneNode.content));

    if (linkedEntries.length === 0) {
      return warnings;
    }

    const summary = (sceneNode.summary ?? "").trim().toLowerCase();
    const pov = (sceneNode.pov ?? "").trim().toLowerCase();

    const characterEntries = linkedEntries.filter(
      ({ entry }) => entry.category === "character",
    );
    const povEntries = linkedEntries.filter(
      ({ entry, link }) =>
        entry.category === "character" && link.role === "pov",
    );

    if (povEntries.length > 0) {
      const matchesPov = povEntries.some(({ entry }) =>
        [entry.name, ...entry.aliases]
          .map((name) => name.toLowerCase())
          .some((name) => pov === name || pov.includes(name)),
      );

      if (!matchesPov) {
        warnings.push(
          "POV link exists but scene POV field does not match the linked character.",
        );
      }
    }

    if (characterEntries.length > 0 && !summary) {
      warnings.push(
        "Linked characters exist, but scene summary is empty. Add a summary to improve continuity checks.",
      );
    } else if (characterEntries.length > 0 && summary) {
      const summaryMentionsCharacter = characterEntries.some(({ entry }) =>
        [entry.name, ...entry.aliases]
          .map((name) => name.toLowerCase())
          .some((name) => summary.includes(name)),
      );

      if (!summaryMentionsCharacter) {
        warnings.push(
          "Linked characters are not referenced in the scene summary.",
        );
      }
    }

    return warnings;
  }, [linkedEntries, sceneNode]);

  const hasEntries = (entries?.length ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="w-sheet sm:w-sheet-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Codex Entries
          </SheetTitle>
          <p className="text-sm text-muted-foreground pr-6">
            Turn this scene into usable story intelligence. Linked codex entries
            power filters, search relevance, and timeline coverage views.
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 px-4 pb-4 space-y-4">
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              How to use this effectively
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              1. Link the key people, places, and plot lines in this scene. 2.
              Set a role for each linked entry. 3. Use Plan filters and Timeline
              to spot missing coverage and continuity gaps.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Shortcuts: <kbd>Cmd/Ctrl + F</kbd> to focus search,{" "}
              <kbd>Cmd/Ctrl + Shift + L</kbd> to jump to manual mention linking.
            </p>
          </div>

          {!hasEntries && entries && (
            <div className="rounded-lg border border-dashed bg-background/70 p-4 space-y-3">
              <p className="text-sm font-medium">No codex entries yet</p>
              <p className="text-xs text-muted-foreground">
                Create characters, locations, and plot threads first, then come
                back to link them to this scene.
              </p>
              <Button size="sm" className="gap-2" onClick={navigateToCodex}>
                Open Codex Workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {unlinkedMentionCandidates.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200/70 bg-amber-50/50 dark:bg-amber-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Unlinked mentions in scene text (
                  {unlinkedMentionCandidates.length})
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These names are already present in prose but not linked to Codex
                metadata yet. Link each one manually to strengthen planning
                intelligence.
              </p>
              <div className="space-y-2">
                {unlinkedMentionCandidates.map(({ entry, matchedTerms }) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Matched: {matchedTerms.slice(0, 3).join(", ")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending(entry.id)}
                      onClick={() => toggleLink(entry)}
                    >
                      {isPending(entry.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {consistencyWarnings.length > 0 && (
            <div className="space-y-2 rounded-lg border border-rose-200/70 bg-rose-50/60 dark:bg-rose-500/5 p-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Consistency warnings
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                {consistencyWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendedEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Suggested from scene context
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendedEntries.map((entry) => (
                  <Button
                    key={entry.id}
                    variant="outline"
                    size="sm"
                    className="h-7"
                    disabled={isPending(entry.id)}
                    onClick={() => toggleLink(entry)}
                  >
                    {isPending(entry.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span className="max-w-[9rem] truncate">{entry.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Linked Entries */}
          {linkedEntries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Currently Linked ({linkedEntries.length})
              </h3>
              <div className="space-y-1">
                {linkedEntries.map(({ link, entry }) => {
                  const config = CATEGORY_CONFIG[entry.category];
                  const Icon = config.icon;
                  const pending = isPending(entry.id);

                  return (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
                    >
                      <div
                        className={`h-8 w-8 rounded-full ${config.color} flex items-center justify-center`}
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
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {entry.name}
                        </div>
                        <select
                          value={link.role}
                          disabled={pending}
                          onChange={(e) =>
                            updateRole(
                              entry.id,
                              e.target.value as SceneCodexLinkRole,
                            )
                          }
                          className="mt-0.5 text-xs text-muted-foreground rounded border bg-background/70 px-1 py-0.5 cursor-pointer hover:text-foreground disabled:cursor-not-allowed"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Unlink entry"
                        className="h-7 w-7"
                        disabled={pending}
                        onClick={() => toggleLink(entry)}
                      >
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search */}
          <Input
            id={searchInputId}
            placeholder="Search codex entries..."
            value={searchQuery}
            disabled={!hasEntries}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Available Entries */}
          <ScrollArea className="h-scroll-lg">
            <div className="space-y-4 pr-4">
              {!entries && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading codex entries...
                </div>
              )}

              {(
                Object.entries(groupedEntries) as [
                  CodexCategory,
                  CodexEntry[],
                ][]
              ).map(([category, catEntries]) => {
                if (catEntries.length === 0) return null;
                const config = CATEGORY_CONFIG[category];
                const Icon = config.icon;

                return (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </h4>
                    <div className="space-y-1">
                      {catEntries.map((entry) => {
                        const linked = isLinked(entry.id);
                        const pending = isPending(entry.id);

                        return (
                          <button
                            key={entry.id}
                            disabled={pending}
                            onClick={() => toggleLink(entry)}
                            className={`
                              w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors
                              ${
                                linked
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-muted border border-transparent"
                              }
                              ${pending ? "opacity-70 cursor-not-allowed" : ""}
                            `}
                          >
                            <div
                              className={`h-7 w-7 rounded-full ${config.color} flex items-center justify-center`}
                            >
                              {entry.thumbnail ? (
                                <img
                                  src={entry.thumbnail}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                <Icon className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <span className="flex-1 text-sm truncate min-w-0">
                              {entry.name}
                            </span>
                            {pending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : linked ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
