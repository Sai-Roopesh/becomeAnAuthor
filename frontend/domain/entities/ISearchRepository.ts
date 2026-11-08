export interface SearchResult {
  id: string;
  title: string;
  type: "scene" | "codex";
  snippet: string;
}

export interface ISearchRepository {
  search(
    projectPath: string,
    query: string,
    options?: { scope?: "all" | "scenes" | "codex" },
  ): Promise<SearchResult[]>;
}
