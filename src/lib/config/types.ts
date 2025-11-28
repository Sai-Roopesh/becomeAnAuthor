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
    createdAt: number;
    updatedAt: number;
}

export interface CodexRelation {
    id: string;
    parentId: string; // Codex entry that contains the relation
    childId: string; // Codex entry being referenced
    createdAt: number;
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
