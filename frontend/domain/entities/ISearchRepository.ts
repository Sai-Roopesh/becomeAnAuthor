export interface SearchResult {
  id: string;
  title: string;
  type: "scene" | "codex";
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
