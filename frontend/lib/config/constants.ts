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
  AI_CONNECTIONS: "ai_connections",
  LAST_USED_MODEL: "last_used_model",
  // Google Drive OAuth
  GOOGLE_TOKENS: "google_oauth_tokens",
  GOOGLE_USER: "google_user_info",
  GOOGLE_PKCE_VERIFIER: "google_pkce_verifier",
} as const;

export const DEBOUNCE_DELAYS = {
  AUTO_SAVE_MS: 1000,
  SEARCH_MS: 300,
} as const;

/**
 * Search Constants
 * Configuration for Fuse.js fuzzy search
 */
export const SEARCH_CONSTANTS = {
  /** Fuse.js threshold (0 = exact match, 1 = match anything) */
  FUSE_THRESHOLD: 0.4,
  /** Minimum characters to trigger match */
  MIN_MATCH_CHARS: 2,
} as const;

/**
 * Default Model Limits
 * Fallback values when model not found in registry
 */
export const DEFAULT_MODEL_LIMITS = {
  MAX_INPUT_TOKENS: 8192,
  MAX_OUTPUT_TOKENS: 4096,
  RECOMMENDED_OUTPUT: 2000,
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
  CLIENT_ID: process.env["NEXT_PUBLIC_GOOGLE_CLIENT_ID"] || "",
  CLIENT_SECRET: process.env["NEXT_PUBLIC_GOOGLE_CLIENT_SECRET"] || "",
  REDIRECT_URI:
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "http://localhost:3000/auth/callback",
  SCOPES: [
    "https://www.googleapis.com/auth/drive.file", // Access only app-created files
    "https://www.googleapis.com/auth/drive.metadata.readonly", // Read file metadata (needed to search for our folder)
    "https://www.googleapis.com/auth/userinfo.email", // Access user email
    "https://www.googleapis.com/auth/userinfo.profile", // Access user profile (name, picture)
  ],
  AUTH_ENDPOINT: "https://accounts.google.com/o/oauth2/v2/auth",
  TOKEN_ENDPOINT: "https://oauth2.googleapis.com/token",
  REVOKE_ENDPOINT: "https://oauth2.googleapis.com/revoke",
} as const;

/**
 * Auto-backup intervals (in milliseconds)
 */
export const BACKUP_INTERVALS = {
  "15min": 15 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
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
  OPENROUTER_BASE: "https://openrouter.ai/api/v1",
  OPENROUTER_CHAT: "https://openrouter.ai/api/v1/chat/completions",
  OPENROUTER_MODELS: "https://openrouter.ai/api/v1/models",
} as const;

/**
 * AI Provider Constants
 * Centralized configuration for all AI provider integrations
 */
export const AI_CONSTANTS = {
  DEFAULT_TEMPERATURE: 0.7,
  REQUEST_TIMEOUT_MS: 60000, // 60 seconds for AI requests
  ENDPOINTS: {
    OPENROUTER: "https://openrouter.ai/api/v1",
    GOOGLE: "https://generativelanguage.googleapis.com/v1beta",
    MISTRAL: "https://api.mistral.ai/v1",
    OPENAI: "https://api.openai.com/v1",
    KIMI: "https://api.moonshot.cn/v1",
  },
} as const;

/**
 * UI Constants
 * Centralized UI configuration values
 */
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: "16rem",
  SIDEBAR_WIDTH_MOBILE: "18rem",
  SIDEBAR_WIDTH_ICON: "3rem",
  SIDEBAR_KEYBOARD_SHORTCUT: "b",
  SIDEBAR_COOKIE_NAME: "sidebar_state",
  SIDEBAR_COOKIE_MAX_AGE: 60 * 60 * 24 * 7, // 7 days
  MAX_CRASH_REPORTS: 10,
} as const;

/**
 * Export Template Variables
 * Available placeholders for front/back matter in document exports
 */
export const TEMPLATE_VARIABLES = {
  title: { key: "{{title}}", label: "Project Title", placeholder: "My Novel" },
  author: { key: "{{author}}", label: "Author Name", placeholder: "John Doe" },
  year: {
    key: "{{year}}",
    label: "Current Year",
    placeholder: new Date().getFullYear().toString(),
  },
  date: {
    key: "{{date}}",
    label: "Current Date",
    placeholder: new Date().toLocaleDateString(),
  },
  wordCount: {
    key: "{{wordCount}}",
    label: "Total Word Count",
    placeholder: "0",
  },
} as const;

/**
 * Collaboration Constants
 */
export const COLLABORATION = {
  ROOM_PREFIX: "becomeauthor-",
  /** Public signaling servers for WebRTC (use self-hosted in production) */
  SIGNALING_SERVERS: [
    "wss://signaling.yjs.dev",
    "wss://y-webrtc-signaling-eu.herokuapp.com",
    "wss://y-webrtc-signaling-us.herokuapp.com",
  ],
  /** Maximum retry attempts for WebRTC reconnection */
  MAX_RECONNECT_ATTEMPTS: 3,
  /** Base delay before reconnection attempt (multiplied by attempt number) */
  BASE_RECONNECT_DELAY_MS: 2000,
} as const;

/**
 * Cache Constants
 */
export const CACHE_CONSTANTS = {
  /** Maximum number of context assembly cache entries */
  CONTEXT_CACHE_SIZE: 50,
  /** Model discovery cache TTL */
  MODEL_CACHE_TTL_MS: 5 * 60 * 1000,
} as const;

/**
 * Rate Limiting Constants
 */
export const RATE_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 20,
  MAX_REQUESTS_PER_HOUR: 200,
  WARNING_THRESHOLD: 0.8,
} as const;

/**
 * Infrastructure Constants
 */
export const INFRASTRUCTURE = {
  /** Token refresh buffer before expiry */
  TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000,
  /** Tab election delay */
  TAB_ELECTION_DELAY_MS: 500,
  /** Trash retention period */
  TRASH_RETENTION_DAYS: 30,
} as const;

/**
 * Dashboard Inspirational Quotes
 */
export const DASHBOARD_QUOTES = [
  "The scariest moment is always just before you start.",
  "You can always edit a bad page. You can't edit a blank page.",
  "Start writing, no matter what. The water does not flow until the faucet is turned on.",
  "Every secret of a writer's soul is written large in his works.",
  "There is no greater agony than bearing an untold story inside you.",
] as const;

/**
 * Editor Constants
 * Magic numbers for editor components
 */
export const EDITOR_CONSTANTS = {
  // Text Selection Menu
  MIN_SELECTION_WORDS: 4,
  MENU_OFFSET_PX: 50,

  // Format Settings
  FONT_SIZE_MIN: 12,
  FONT_SIZE_MAX: 24,
  FONT_SIZE_DEFAULT: 16,
  PAGE_WIDTH_MIN: 400,
  PAGE_WIDTH_MAX: 1000,
  PAGE_WIDTH_DEFAULT: 700,
  LINE_HEIGHT_MIN: 1.2,
  LINE_HEIGHT_MAX: 2.5,
  LINE_HEIGHT_DEFAULT: 1.8,
} as const;

/**
 * Section Colors
 * Available colors for section highlighting in the editor
 */
export const SECTION_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
] as const;

/**
 * Idea Category Colors
 * Tailwind class strings for idea category badges
 */
export const IDEA_CATEGORY_COLORS = {
  plot: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  character: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  worldbuilding: "bg-green-500/20 text-green-400 border-green-500/30",
  dialogue: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  other: "bg-muted text-muted-foreground border-border",
} as const;

/**
 * Idea Category Labels
 * Human-readable labels for idea categories
 */
export const IDEA_CATEGORY_LABELS = {
  plot: "Plot",
  character: "Character",
  worldbuilding: "World",
  dialogue: "Dialogue",
  other: "Other",
} as const;

/**
 * Navigation Constants
 * UI limits and display settings for navigation components
 */
export const NAVIGATION_CONSTANTS = {
  IDEAS_DISPLAY_LIMIT: 10,
} as const;
