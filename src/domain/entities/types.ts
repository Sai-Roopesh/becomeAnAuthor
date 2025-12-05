export interface BaseNode {
    id: string;
    projectId: string;
    parentId: string | null; // Null for Acts, Act ID for Chapters
    title: string;
    order: number; // Float for easy reordering
    expanded: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface Act extends BaseNode {
    type: 'act';
}

export interface Chapter extends BaseNode {
    type: 'chapter';
}

export interface Beat {
    id: string;
    text: string;
    isCompleted: boolean;
}

export interface Scene extends BaseNode {
    type: 'scene';
    pov?: string; // Point of view character
    subtitle?: string; // Scene subtitle (e.g., time skip, location)
    labels?: string[]; // Tags/labels for tracking (e.g., "edited", "draft")
    excludeFromAI?: boolean; // Exclude from AI context
    content: any; // Tiptap JSON
    summary: string;
    status: 'draft' | 'revised' | 'final';
    wordCount: number;
    beats?: Beat[];
}

export type DocumentNode = Act | Chapter | Scene;

export type CodexCategory = 'character' | 'location' | 'item' | 'lore' | 'subplot';

export type AIContext = 'always' | 'detected' | 'exclude' | 'never';

export interface CodexEntry {
    id: string;
    projectId: string;
    name: string;
    aliases: string[];
    category: CodexCategory;
    description: string;
    attributes: Record<string, string>;
    tags: string[];
    references: string[];
    image?: string;
    thumbnail?: string; // Base64 image for entry thumbnail
    customDetails?: Record<string, any>; // User-defined fields
    aiContext?: AIContext; // AI inclusion setting
    trackMentions?: boolean; // Track mentions in manuscript
    notes?: string; // Research notes (not seen by AI)
    externalLinks?: string[]; // External reference URLs
    settings: {
        isGlobal: boolean;
        doNotTrack: boolean;
    };
    // NEW: Phase 1 enhancements
    templateId?: string; // which template was used
    customFields?: Record<string, any>; // template field values
    gallery?: string[]; // multiple images (Base64 or URLs)
    completeness?: number; // % of template filled (0-100)
    createdAt: number;
    updatedAt: number;
}

export interface CodexRelation {
    id: string;
    parentId: string; // Codex entry that contains the relation
    childId: string; // Codex entry being referenced
    // NEW: Phase 1 enhancements
    type?: string; // relationship type ID
    strength?: number; // 1-10 scale
    description?: string; // details about the relationship
    tags?: string[]; // tag IDs
    createdAt: number;
    updatedAt?: number; // when relationship was last modified
}

export interface Project {
    id: string;
    title: string;
    author?: string;
    seriesId?: string;
    seriesIndex?: string; // e.g. "Book 1"
    language?: string;
    coverImage?: string; // Base64 or URL
    archived?: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface Series {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export interface Snippet {
    id: string;
    projectId: string;
    title: string;
    content: any; // Tiptap JSON
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
    content: any; // Tiptap JSON
    color: string; // hex color
    excludeFromAI: boolean;
    position: number; // Character position in scene
    createdAt: number;
}

// Story Analysis Types
export interface StoryAnalysis {
    id: string;
    projectId: string;
    analysisType: 'synopsis' | 'plot-threads' | 'character-arcs' |
    'timeline' | 'contradictions' | 'foreshadowing' |
    'pacing' | 'genre-fit' | 'alpha-reader' | 'beta-reader';

    scope: 'full' | 'act' | 'chapter' | 'scene';
    scopeIds: string[]; // IDs of analyzed nodes

    results: {
        summary?: string;
        insights: AnalysisInsight[];
        metrics?: Record<string, any>;
    };

    // Version tracking
    createdAt: number;
    manuscriptVersion: number; // Sum of all scene updatedAt timestamps
    wordCountAtAnalysis: number;
    scenesAnalyzedCount: number;

    // AI metadata
    model: string;
    tokensUsed?: number;

    // User interaction
    dismissed: boolean;
    resolved: boolean;
    userNotes?: string;
}

export interface AnalysisInsight {
    id: string;
    type: 'positive' | 'neutral' | 'warning' | 'error';
    category: 'plot' | 'character' | 'timeline' | 'pacing' | 'world-building' | 'dialogue';
    message: string;
    severity: 1 | 2 | 3; // 1=minor, 2=moderate, 3=critical

    // References to scenes
    sceneReferences?: SceneReference[];

    autoSuggest?: string;
    dismissed: boolean;
    resolved: boolean;
}

export interface SceneReference {
    sceneId: string;
    sceneTitle: string;
    excerpt?: string;
}



// Chat Interface Types
export interface ChatThread {
    id: string;
    projectId: string;
    name: string;
    pinned: boolean;
    archived: boolean;
    defaultPrompt?: string; // Prompt ID
    defaultModel?: string; // Model name
    createdAt: number;
    updatedAt: number;
}

export interface ChatMessage {
    id: string;
    threadId: string;
    role: 'user' | 'assistant';
    content: string;
    model?: string; // Model used for this message
    prompt?: string; // Prompt used for this message
    context?: ChatContext; // Context included in this message
    timestamp: number;
}

export interface ChatContext {
    novelText?: 'full' | 'outline' | string; // 'full', 'outline', or POV character name
    acts?: string[]; // Act IDs
    chapters?: string[]; // Chapter IDs
    scenes?: string[]; // Scene IDs
    snippets?: string[]; // Snippet IDs
    codexEntries?: string[]; // Codex entry IDs
}

// Type Guards
export function isAct(node: DocumentNode): node is Act {
    return node.type === 'act';
}

export function isChapter(node: DocumentNode): node is Chapter {
    return node.type === 'chapter';
}

export function isScene(node: DocumentNode): node is Scene {
    return node.type === 'scene';
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
    storyAnalyses: StoryAnalysis[]; // NEW
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
    interval: '15min' | '1hour' | 'daily';
    projectIds: string[]; // Which projects to auto-backup
    lastBackup?: number; // Timestamp of last backup
}

export interface DriveBackupMetadata {
    version: string;
    exportedAt: number;
    appVersion: string;
    backupType: 'manual' | 'auto';
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
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'select'
    | 'multi-select'
    | 'slider'
    | 'image';

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
    | 'personal'
    | 'professional'
    | 'geographical'
    | 'item'
    | 'lore';

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

