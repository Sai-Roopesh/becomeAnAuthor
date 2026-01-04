import Fuse from 'fuse.js';
import type { FuseResultMatch } from 'fuse.js';
import type { TiptapContent } from '@/shared/types/tiptap';
import { SEARCH_CONSTANTS } from '@/lib/config/constants';

/**
 * Search Service using Fuse.js for fuzzy searching
 * Provides unified search across scenes and codex entries
 */

export interface SearchableScene {
  id: string;
  title: string;
  content?: TiptapContent | null;
  summary?: string;
  type: 'scene';
}

export interface SearchableCodex {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'codex';
}

export type SearchableItem = SearchableScene | SearchableCodex;

export interface SearchResult<T> {
  item: T;
  score: number;
  matches?: readonly FuseResultMatch[];
}

class SearchService {
  private sceneFuse: Fuse<SearchableScene> | null = null;
  private codexFuse: Fuse<SearchableCodex> | null = null;

  /**
   * Initialize scene search index
   */
  initializeSceneSearch(scenes: SearchableScene[]) {
    this.sceneFuse = new Fuse(scenes, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'summary', weight: 1.5 },
        { name: 'content', weight: 1 },
      ],
      threshold: SEARCH_CONSTANTS.FUSE_THRESHOLD,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: SEARCH_CONSTANTS.MIN_MATCH_CHARS,
    });
  }

  /**
   * Initialize codex search index
   */
  initializeCodexSearch(entries: SearchableCodex[]) {
    this.codexFuse = new Fuse(entries, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'category', weight: 1.5 },
        { name: 'description', weight: 1 },
      ],
      threshold: SEARCH_CONSTANTS.FUSE_THRESHOLD,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: SEARCH_CONSTANTS.MIN_MATCH_CHARS,
    });
  }

  /**
   * Search scenes with fuzzy matching
   */
  searchScenes(query: string): SearchResult<SearchableScene>[] {
    if (!this.sceneFuse || !query.trim()) {
      return [];
    }

    const results = this.sceneFuse.search(query);

    return results.map((result) => ({
      item: result.item,
      score: result.score || 0,
      matches: result.matches ?? [],
    }));
  }

  /**
   * Search codex entries with fuzzy matching
   */
  searchCodex(query: string): SearchResult<SearchableCodex>[] {
    if (!this.codexFuse || !query.trim()) {
      return [];
    }

    const results = this.codexFuse.search(query);

    return results.map((result) => ({
      item: result.item,
      score: result.score || 0,
      matches: result.matches ?? [],
    }));
  }

  /**
   * Search both scenes and codex
   */
  searchAll(query: string): {
    scenes: SearchResult<SearchableScene>[];
    codex: SearchResult<SearchableCodex>[];
  } {
    return {
      scenes: this.searchScenes(query),
      codex: this.searchCodex(query),
    };
  }

  /**
   * Update scene index (when scenes change)
   */
  updateSceneIndex(scenes: SearchableScene[]) {
    this.initializeSceneSearch(scenes);
  }

  /**
   * Update codex index (when entries change)
   */
  updateCodexIndex(entries: SearchableCodex[]) {
    this.initializeCodexSearch(entries);
  }
}

// Singleton instance with SSR guard
let _searchService: SearchService | null = null;

/**
 * Get the search service singleton.
 * Lazily initialized on first access.
 * @throws Error if called during SSR
 */
export function getSearchService(): SearchService {
  if (typeof window === 'undefined') {
    throw new Error('searchService is client-only and cannot be used during SSR');
  }
  if (!_searchService) {
    _searchService = new SearchService();
  }
  return _searchService;
}

// Backwards-compatible export (safe for client-side use)
// During SSR, this evaluates to a proxy that throws on access
export const searchService: SearchService = typeof window !== 'undefined'
  ? getSearchService()
  : new Proxy({} as SearchService, {
    get() {
      throw new Error('searchService is client-only and cannot be used during SSR');
    },
  });

