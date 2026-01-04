/**
 * Codex Feature Constants
 * Centralized configuration for codex-related values
 */

/**
 * Default stats shown for character arc points
 */
export const DEFAULT_CHARACTER_STATS = ['confidence', 'power', 'influence'] as const;

/**
 * Stats available by codex category
 * Used in ArcPointEditor for graphing character evolution
 */
export const STATS_BY_CATEGORY = {
    character: ['confidence', 'power', 'influence'],
    location: ['prosperity', 'danger', 'accessibility'],
    item: ['rarity', 'power', 'utility'],
    lore: [],
    subplot: ['tension', 'progress'],
} as const;

export type StatName = typeof DEFAULT_CHARACTER_STATS[number];
