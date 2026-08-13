export interface SearchResult {
  title: string;
  path: string;
  snippet?: string;
  matchType: "title" | "content" | "tag";
  type: "scene" | "codex";
  id: string;
  score?: number;
  category?: string;
}

export interface ISearchRepository {
  search(
    projectPath: string,
    query: string,
    options?: { scope?: "all" | "scenes" | "codex" },
  ): Promise<SearchResult[]>;
}
