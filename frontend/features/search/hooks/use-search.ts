"use client";

import { useEffect, useMemo, useState } from "react";
import {
  searchProject,
  type SearchResult as BackendSearchResult,
} from "@/core/tauri/commands";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { TauriNodeRepository } from "@/infrastructure/repositories/TauriNodeRepository";
import {
  type SearchResult,
  type SearchableCodex,
  type SearchableScene,
} from "@/lib/search-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("useSearch");

export type SearchScope = "all" | "scenes" | "codex";

function mapBackendResults(results: BackendSearchResult[]): {
  scenes: SearchResult<SearchableScene>[];
  codex: SearchResult<SearchableCodex>[];
} {
  const scenes: SearchResult<SearchableScene>[] = [];
  const codex: SearchResult<SearchableCodex>[] = [];

  for (const result of results) {
    const type = result.contentType || result.type;
    if (type === "scene") {
      scenes.push({
        item: {
          id: result.id,
          title: result.title,
          summary: result.snippet || "",
          type: "scene",
        },
        score: result.score ?? 0,
      });
      continue;
    }

    if (type === "codex") {
      codex.push({
        item: {
          id: result.id,
          name: result.title,
          description: result.snippet || "",
          category: result.category || "codex",
          type: "codex",
        },
        score: result.score ?? 0,
      });
    }
  }

  return { scenes, codex };
}

/**
 * Search hook for project content and codex entries.
 * Uses backend search as source of truth for consistent results.
 */
export function useSearch(projectId: string) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [results, setResults] = useState<{
    scenes: SearchResult<SearchableScene>[];
    codex: SearchResult<SearchableCodex>[];
  }>({ scenes: [], codex: [] });
  const [isLoading, setIsLoading] = useState(false);

  const { projectRepository: projectRepo } = useAppServices();

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let cancelled = false;

    if (!trimmedQuery) {
      setResults({ scenes: [], codex: [] });
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);

      try {
        const project = await projectRepo.get(projectId);
        const tauriProject = project as
          | (typeof project & { _tauriPath?: string })
          | undefined;
        const projectPath =
          tauriProject?._tauriPath ||
          TauriNodeRepository.getInstance().getProjectPath();

        if (!projectPath) {
          if (!cancelled) setResults({ scenes: [], codex: [] });
          return;
        }

        const backendResults = await searchProject(
          projectPath,
          trimmedQuery,
          scope === "all" ? undefined : scope,
        );

        if (!cancelled) {
          setResults(mapBackendResults(backendResults));
        }
      } catch (error) {
        log.error("Search failed", error);
        if (!cancelled) {
          setResults({ scenes: [], codex: [] });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, projectId, projectRepo, scope]);

  return {
    query,
    setQuery,
    scope,
    setScope,
    results,
    isLoading,
  };
}
