export interface SearchResult {
  id: string;
  title: string;
  type: "scene" | "codex";
  snippet?: string;
  score?: number;
  category?: string;
  path: string;
}
