import type {
  Act,
  Chapter,
  CodexCategory,
  CodexEntry,
  DocumentNode,
  Scene,
  SceneCodexLink,
} from "@/domain/entities/types";

interface FilterSceneBasedNodesInput {
  nodes: DocumentNode[];
  search: string;
  selectedCodexIds: string[];
  categoryFilter: CodexCategory | null;
  codexEntries: CodexEntry[];
  links: SceneCodexLink[];
}

function includesText(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function filterSceneBasedNodes({
  nodes,
  search,
  selectedCodexIds,
  categoryFilter,
  codexEntries,
  links,
}: FilterSceneBasedNodesInput): DocumentNode[] {
  const query = search.trim().toLowerCase();
  const hasTextFilter = query.length > 0;
  const hasCodexFilters =
    selectedCodexIds.length > 0 || categoryFilter !== null;

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
      .filter((entry) =>
        categoryFilter ? entry.category === categoryFilter : true,
      )
      .map((entry) => entry.id),
  );

  const linksByScene = new Map<string, Array<{ codexId: string }>>();
  for (const link of links) {
    const existing = linksByScene.get(link.sceneId) ?? [];
    existing.push({ codexId: link.codexId });
    linksByScene.set(link.sceneId, existing);
  }

  const codexById = new Map(codexEntries.map((entry) => [entry.id, entry]));

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

      const chapterScenes = scenesByChapter.get(chapter.id) ?? [];
      const visibleScenes = chapterScenes.filter((scene) => {
        if (!scenePassesCodexFilters(scene)) return false;
        if (!hasTextFilter) return true;
        if (actTitleMatch || chapterTitleMatch) return true;
        return sceneMatchesText(scene);
      });

      const includeEmptyChapter =
        chapterScenes.length === 0 &&
        !hasCodexFilters &&
        (!hasTextFilter || actTitleMatch || chapterTitleMatch);

      if (visibleScenes.length > 0 || includeEmptyChapter) {
        visibleChapters.push(chapter);
        if (visibleScenes.length > 0) {
          visibleScenesByChapter.set(chapter.id, visibleScenes);
        }
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
}
