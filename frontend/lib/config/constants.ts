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
    // Google Drive OAuth
    GOOGLE_TOKENS: 'google_oauth_tokens',
    GOOGLE_USER: 'google_user_info',
    GOOGLE_PKCE_VERIFIER: 'google_pkce_verifier',
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

/**
 * Google OAuth 2.0 Configuration
 */
export const GOOGLE_CONFIG = {
    CLIENT_ID: process.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || '',
    CLIENT_SECRET: process.env['NEXT_PUBLIC_GOOGLE_CLIENT_SECRET'] || '',
    REDIRECT_URI: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'http://localhost:3000/auth/callback',
    SCOPES: [
        'https://www.googleapis.com/auth/drive.file', // Access only app-created files
        'https://www.googleapis.com/auth/drive.metadata.readonly', // Read file metadata (needed to search for our folder)
        'https://www.googleapis.com/auth/userinfo.email', // Access user email
        'https://www.googleapis.com/auth/userinfo.profile', // Access user profile (name, picture)
    ],
    AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
    REVOKE_ENDPOINT: 'https://oauth2.googleapis.com/revoke',
} as const;

/**
 * Auto-backup intervals (in milliseconds)
 */
export const BACKUP_INTERVALS = {
    '15min': 15 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    'daily': 24 * 60 * 60 * 1000,
} as const;

/**
 * Global timeout values (in milliseconds)
 */
export const TIMEOUTS = {
    FETCH_DEFAULT_MS: 30000,
    LEADER_ELECTION_MS: 10000,
    TAB_HEARTBEAT_MS: 2000,
    TAB_LEADER_TIMEOUT_MS: 5000,
    TEST_WAIT_MS: 5000,
    RETRY_INITIAL_MS: 1000,
    RETRY_MAX_MS: 10000,
} as const;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
    OPENROUTER_BASE: 'https://openrouter.ai/api/v1',
    OPENROUTER_CHAT: 'https://openrouter.ai/api/v1/chat/completions',
    OPENROUTER_MODELS: 'https://openrouter.ai/api/v1/models',
} as const;

