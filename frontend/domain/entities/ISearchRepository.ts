export interface SearchResult {
  id: string;
  type: "scene" | "codex";
  title: string;
  snippet?: string;
  score?: number;
  category?: string;
  path: string;
}

export interface ISearchRepository {
  search(
    projectPath: string,
    query: string,
    options?: { scope?: "all" | "scenes" | "codex" },
  ): Promise<SearchResult[]>;
}
