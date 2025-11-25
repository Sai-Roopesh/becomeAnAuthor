/**
 * Application constants
 * Single source of truth for magic numbers and configuration values
 */

export const AI_DEFAULTS = {
    TEMPERATURE: 0.7,
    MAX_TOKENS: 2000,
    CONTEXT_WINDOW_CHARS: 2000,
    CONTEXT_WINDOW_TOKENS: 4000,
    MAX_TOKENS_SUMMARIZE: 500,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
} as const;

export const STORAGE_KEYS = {
    AI_CONNECTIONS: 'ai_connections',
    LAST_USED_MODEL: 'last_used_model',
} as const;

export const DEBOUNCE_DELAYS = {
    AUTO_SAVE_MS: 1000,
    SEARCH_MS: 300,
} as const;

export const FEATURE_FLAGS = {
    CHARACTER_DETECTION: false,
    CHAT_WITH_SCENE: false,
    SAVE_AS_SNIPPET: false,
    RETRY_MESSAGE: false,
    DISSOLVE_SECTION: false,
} as const;
