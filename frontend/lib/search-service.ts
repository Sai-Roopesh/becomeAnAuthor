import Fuse from 'fuse.js';
import type { FuseResultMatch } from 'fuse.js';
import type { TiptapContent } from '@/shared/types/tiptap';

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
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
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
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
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

// Singleton instance
export const searchService = new SearchService();
