import type { TiptapContent } from "@/shared/types/tiptap";

/**
 * Shared search result types.
 * Search execution now runs through backend commands for consistency.
 */

export interface SearchableScene {
  id: string;
  title: string;
  content?: TiptapContent | null;
  summary?: string;
  type: "scene";
}

export interface SearchableCodex {
  id: string;
  name: string;
  description: string;
  category: string;
  type: "codex";
}

export type SearchableItem = SearchableScene | SearchableCodex;

export interface SearchResult<T> {
  item: T;
  score: number;
}
