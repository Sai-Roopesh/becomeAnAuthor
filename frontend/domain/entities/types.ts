import type { TiptapContent } from "@/shared/types/tiptap";

export interface BaseNode {
  id: string;
  projectId: string;
  parentId: string | null; // Null for Acts, Act ID for Chapters
  title: string;
  order: number; // Float for easy reordering
  expanded: boolean;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Act extends BaseNode {
  type: "act";
}

export interface Chapter extends BaseNode {
  type: "chapter";
}

export interface Beat {
  id: string;
  text: string;
  isCompleted: boolean;
}

// Mention tracking for codex entries
export interface Mention {
  id: string;
  codexEntryId: string;
  sourceType: "scene" | "codex" | "snippet" | "chat";
  sourceId: string;
  sourceTitle: string;
  position: number; // Character position in source
  context: string; // Surrounding text snippet
  createdAt: number;
}

export interface Scene extends BaseNode {
  type: "scene";
  pov?: string; // Point of view character
  subtitle?: string; // Scene subtitle (e.g., time skip, location)
  labels?: string[]; // Tags/labels for tracking (e.g., "edited", "draft")
  excludeFromAI?: boolean; // Exclude from AI context
  content: TiptapContent; // Tiptap JSON
  summary: string;
  status: "draft" | "revised" | "final";
  wordCount: number;
  beats?: Beat[];
}

export type DocumentNode = Act | Chapter | Scene;

export type CodexCategory =
  | "character"
  | "location"
  | "item"
  | "lore"
  | "subplot";

/**
 * AI Context inclusion setting for codex entries
 * - 'always': Always include in AI context
 * - 'detected': Include when @mentioned or detected
 * - 'never': Never include in AI context
 */
export type AIContext = "always" | "detected" | "exclude" | "never";

export type IdeaCategory =
  | "plot"
  | "character"
  | "worldbuilding"
  | "dialogue"
  | "other";

export interface Idea {
  id: string;
  projectId: string;
  content: string;
  category: IdeaCategory;
  tags: string[];
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SceneNote {
  id: string;
  sceneId: string;
  projectId: string;
  content: TiptapContent;
  createdAt: number;
  updatedAt: number;
}

// Arc Point types for character evolution tracking
export interface KnowledgeState {
  knows: string[];
  doesNotKnow: string[];
  believes: string[];
  misconceptions: string[];
}

export interface EmotionalState {
  primaryEmotion: string;
  intensity?: number; // 1-10
  mentalState?: string[];
  internalConflict?: string;
  trauma?: string[];
}

export interface GoalsAndMotivations {
  primaryGoal?: string;
  secondaryGoals?: string[];
  fears?: string[];
  desires?: string[];
  obstacles?: string[];
}

export interface ArcPoint {
  id: string;
  bookId: string;
  sceneId?: string;
  eventType: "book" | "scene" | "flashback" | "offscreen";
  eventLabel: string;
  description: string;
  timestamp: number;
  age?: number;
  status?: string;
  location?: string;
  stats?: Record<string, number>;
  notes?: string;
  significance?: string;
  relationships: Record<string, string>;
  knowledgeState?: KnowledgeState;
  emotionalState?: EmotionalState;
  goalsAndMotivations?: GoalsAndMotivations;
}

export interface CodexEntry {
  id: string;
  seriesId: string; // Required - series-first architecture
  projectId?: string; // Legacy - kept for backwards compatibility
  name: string;
  aliases: string[];
  category: CodexCategory;
  description: string;
  coreDescription?: string; // Concise core description for AI context
  arcPoints?: ArcPoint[]; // Character arc evolution points
  attributes: Record<string, string>;
  tags: string[];
  references: string[];
  image?: string;
  thumbnail?: string; // Base64 image for entry thumbnail
  customDetails?: Record<string, unknown>; // User-defined fields
  aiContext?: AIContext; // AI inclusion setting
  trackMentions?: boolean; // Track mentions in manuscript
  notes?: string; // Research notes (not seen by AI)
  externalLinks?: string[]; // External reference URLs
  settings: {
    // Backend fields
    showInMentions?: boolean;
    fields?: Array<{ name: string; value: string }>;
    // Frontend fields
    isGlobal?: boolean;
    doNotTrack?: boolean;
  };
  // NEW: Phase 1 enhancements
  templateId?: string; // which template was used
  customFields?: Record<string, unknown>; // template field values
  gallery?: string[]; // multiple images (Base64 or URLs)
  completeness?: number; // % of template filled (0-100)
  createdAt: number;
  updatedAt: number;
}

export interface CodexRelation {
  id: string;
  parentId: string;
  childId: string;
  projectId?: string; // Optional - legacy field, codex relations are series-scoped
  typeId?: string; // ✅ Renamed from 'type'
  label?: string; // ✅ Renamed from 'description'
  strength?: number;
  createdAt: number;
  updatedAt: number; // ✅ Made required
}

export interface Project {
  id: string;
  title: string;
  author?: string;
  seriesId: string; // REQUIRED - all projects must belong to a series
  seriesIndex: string; // REQUIRED - e.g., "Book 1"
  language?: string;
  coverImage?: string; // Base64 or URL
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TrashedProject {
  id: string;
  title: string;
  originalPath: string;
  trashPath: string;
  deletedAt: number;
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  author?: string;
  genre?: string;
  status?: "planned" | "in-progress" | "completed" | "hiatus";
  createdAt: number;
  updatedAt: number;
}

export interface Snippet {
  id: string;
  projectId: string;
  title: string;
  content: TiptapContent; // Tiptap JSON
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CodexAddition {
  id: string;
  sceneId: string;
  codexEntryId: string;
  description: string;
  position: number; // Character position in scene
  createdAt: number;
}

export interface Section {
  id: string;
  sceneId: string;
  title: string;
  content: TiptapContent; // Tiptap JSON
  color: string; // hex color
  excludeFromAI: boolean;
  position: number; // Character position in scene
  createdAt: number;
}

// Chat Interface Types
export interface ChatThread {
  id: string;
  projectId: string;
  name: string;
  pinned: boolean;
  archived: boolean;
  deletedAt?: number;
  defaultPrompt?: string; // Prompt ID
  defaultModel?: string; // Model name
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  model?: string; // Model used for this message
  prompt?: string; // Prompt used for this message
  context?: ChatContext; // Context included in this message
  timestamp: number;
}

export interface ChatContext {
  novelText?: "full" | "outline" | string; // 'full', 'outline', or POV character name
  acts?: string[]; // Act IDs
  chapters?: string[]; // Chapter IDs
  scenes?: string[]; // Scene IDs
  snippets?: string[]; // Snippet IDs
  codexEntries?: string[]; // Codex entry IDs
}

// Type Guards
export function isAct(node: DocumentNode): node is Act {
  return node.type === "act";
}

export function isChapter(node: DocumentNode): node is Chapter {
  return node.type === "chapter";
}

export function isScene(node: DocumentNode): node is Scene {
  return node.type === "scene";
}

export interface ExportedProject {
  version: number;
  project: Project;
  nodes: DocumentNode[];
  codex: CodexEntry[];
  chats: ChatThread[];
  messages: ChatMessage[];
  codexRelations: CodexRelation[];
  codexAdditions: CodexAddition[];
  sections: Section[];
  snippets: Snippet[];
}

// Google OAuth and Drive Types
export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Timestamp when access token expires
  scope: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size: number;
}

export interface DriveQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
}

export interface BackupScheduleOptions {
  enabled: boolean;
  interval: "15min" | "1hour" | "daily";
  projectIds: string[]; // Which projects to auto-backup
  lastBackup?: number; // Timestamp of last backup
}

export interface DriveBackupMetadata {
  version: string;
  exportedAt: number;
  appVersion: string;
  backupType: "manual" | "auto";
  projectData: ExportedProject;
}

// ============================================
// Phase 1: Codex Enhancements - New Types
// ============================================

/**
 * Tag System
 */
export interface CodexTag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  category?: CodexCategory; // optional scope to specific category
  createdAt: number;
  updatedAt: number; // ✅ Added to match backend
}

export interface CodexEntryTag {
  id: string;
  entryId: string;
  tagId: string;
}

/**
 * Template System
 */
export type TemplateFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multi-select"
  | "slider"
  | "image";

export interface TemplateField {
  id: string;
  name: string;
  type: TemplateFieldType;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: string[]; // for select types
  min?: number; // for number/slider
  max?: number; // for number/slider
  placeholder?: string;
  helperText?: string;
}

export interface CodexTemplate {
  id: string;
  name: string;
  category: CodexCategory;
  fields: TemplateField[];
  isBuiltIn: boolean;
  projectId?: string; // null for built-ins
  createdAt: number;
}

/**
 * Relationship Types
 */
export type RelationCategory =
  | "personal"
  | "professional"
  | "geographical"
  | "item"
  | "lore";

export interface CodexRelationType {
  id: string;
  name: string;
  category: RelationCategory;
  color: string;
  icon?: string;
  isDirectional: boolean;
  isBuiltIn: boolean;
  canHaveStrength: boolean;
}

// ============================================
// Plan-Codex Integration Types
// ============================================

/**
 * Link between a Scene and a Codex Entry
 * Used for tracking which characters, locations, and plot threads appear in which scenes
 */
export type SceneCodexLinkRole =
  | "appears"
  | "mentioned"
  | "pov"
  | "location"
  | "plot";

export interface SceneCodexLink {
  id: string;
  sceneId: string; // FK to nodes (type='scene')
  codexId: string; // FK to codex
  projectId: string; // FK to projects
  role: SceneCodexLinkRole;
  autoDetected?: boolean; // True if created from @mention detection
  createdAt: number;
  updatedAt: number;
}

// ============================================
// P2P Collaboration Types
// ============================================

/**
 * Represents a collaboration room for a scene
 */
export interface CollaborationRoom {
  id: string; // Unique room ID (sceneId-based)
  sceneId: string; // Scene being edited
  projectId: string; // Parent project
  createdAt: number;
  lastSyncedAt: number;
}

/**
 * Yjs state snapshot for persistence
 */
export interface YjsStateSnapshot {
  sceneId: string;
  projectId: string;
  stateVector: Uint8Array; // Yjs state vector for sync
  update: Uint8Array; // Yjs document update
  savedAt: number;
}

/**
 * Connected peer in a collaboration session
 */
export interface CollaborationPeer {
  id: string; // Peer's unique ID
  name: string; // Display name
  color: string; // Cursor color
  cursor?: {
    // Cursor position
    anchor: number;
    head: number;
  };
  lastSeen: number;
}

/**
 * Collaboration session status
 */
export type CollaborationStatus =
  | "disconnected" // Not connected to any peers
  | "connecting" // Attempting to connect
  | "syncing" // Connected, syncing data
  | "synced"; // Fully synced with peers

// ============================================
// Map & Timeline Types
// ============================================

export interface MapMarker {
  id: string;
  x: number; // percentage
  y: number; // percentage
  label: string;
  color?: string;
  codexId?: string; // Link to Location entry
}

export interface ProjectMap {
  id: string;
  projectId: string;
  name: string;
  imagePath: string; // Relative to project root
  markers: MapMarker[];
  zoomLevel: number;
  panX: number;
  panY: number;
  createdAt: number;
  updatedAt: number;
}

export type WorldEventCategory =
  | "political"
  | "cultural"
  | "natural"
  | "magical"
  | "technological"
  | "military"
  | "other";

export type WorldEventTemporalPrecision = "year" | "date" | "date-time";

export interface WorldEventTemporal {
  precision: WorldEventTemporalPrecision;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface WorldEvent {
  id: string;
  projectId: string;
  title: string;
  description: string;
  temporal: WorldEventTemporal;
  era?: string;
  category: WorldEventCategory;
  importance: "minor" | "moderate" | "major" | "world-changing";
  linkedCodexIds: string[];
  createdAt: number;
  updatedAt: number;
}
