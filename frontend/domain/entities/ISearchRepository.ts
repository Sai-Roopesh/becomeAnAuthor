import type { SearchResult } from "./search-types";

export interface ISearchRepository {
  search(
    projectPath: string,
    query: string,
    options?: { scope?: "all" | "scenes" | "codex" },
  ): Promise<SearchResult[]>;
}
