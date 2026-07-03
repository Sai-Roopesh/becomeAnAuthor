export interface SearchResult {
  id: string;
  kind: "scene" | "codex";
  title: string;
  snippet: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

export interface ISearchRepository {
  search(
    projectPath: string,
    query: string,
    options?: { scope?: "all" | "scenes" | "codex" },
  ): Promise<SearchResult[]>;
}
