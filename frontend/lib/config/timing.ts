/**
 * Timing Constants
 * 
 * Centralized timing values for the application.
 * Use these instead of hardcoding magic numbers.
 * 
 * @see docs/CODING_GUIDELINES.md - File Organization
 */

export const TIMING = {
    // Tab coordination
    /** How often tabs send heartbeats to indicate they're alive */
    HEARTBEAT_INTERVAL_MS: 3000,
    /** How long before a tab is considered stale/dead */
    STALE_TAB_TIMEOUT_MS: 10000,
    /** Delay before checking for multi-tab conflicts */
    MULTI_TAB_CHECK_DELAY_MS: 100,

    // Editor
    /** Debounce delay for auto-saving scene content */
    SAVE_DEBOUNCE_MS: 500,
    /** Debounce delay for saving scene notes */
    SCENE_NOTE_DEBOUNCE_MS: 500,

    // Collaboration
    /** Interval for auto-saving Yjs collaboration state */
    COLLAB_SAVE_INTERVAL_MS: 30000,

    // UI feedback
    /** How long to show "Copied!" feedback */
    COPIED_FEEDBACK_MS: 2000,
    /** Delay before reloading after restore operations */
    RELOAD_DELAY_MS: 500,

    // Rate limiting
    /** Cooldown before showing rate limit warning again */
    WARNING_COOLDOWN_MS: 30000,
} as const;

export type TimingKey = keyof typeof TIMING;
