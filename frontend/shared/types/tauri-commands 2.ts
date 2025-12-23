/**
 * Tauri Command Payload Types (DTOs)
 * 
 * These interfaces strictly mirror the Rust backend structs used in Taur commands.
 * They serve as the Data Transfer Objects (DTOs) for the IPC layer.
 * 
 * @architectural-rule Content must be properly typed (TiptapContent), never any.
 */

import { TiptapContent } from './tiptap';

// ==========================================
// Project Commands
// ==========================================

export interface CreateProjectPayload {
    title: string;
    author?: string;
    location?: string;
}

export interface ProjectMetadata {
    id: string;
    title: string;
    author: string;
    created_at: number;
    updated_at: number;
}

export interface ProjectListResponse {
    projects: ProjectMetadata[];
}

export interface DeleteProjectPayload {
    path: string;
}

export interface ArchiveProjectPayload {
    path: string;
}

// ==========================================
// Node (File System) Commands
// ==========================================

export interface CreateNodePayload {
    projectPath: string;
    parentId?: string;
    name: string;
    type: 'act' | 'chapter' | 'scene';
}

export interface DeleteNodePayload {
    path: string;
}

export interface RenameNodePayload {
    path: string;
    newName: string;
}

export interface MoveNodePayload {
    path: string;
    newParentId?: string;
    newOrder: number;
}

// ==========================================
// Scene Commands
// ==========================================

export interface SaveScenePayload {
    path: string;
    content: TiptapContent; // Strictly typed content
}

export interface LoadSceneResponse {
    content: TiptapContent;
    metadata: Record<string, unknown>;
}

// ==========================================
// Codex (Lore) Commands
// ==========================================

export interface CreateCodexEntryPayload {
    projectPath: string;
    name: string;
    category: string;
    templateId?: string;
}

export interface UpdateCodexEntryPayload {
    path: string;
    content: Record<string, unknown>;
}

export interface DeleteCodexEntryPayload {
    path: string;
}

// ==========================================
// Search Commands
// ==========================================

export interface SearchPayload {
    projectPath: string;
    query: string;
    filters?: {
        types?: string[];
        categories?: string[];
    };
}

export interface SearchResult {
    path: string;
    score: number;
    matches: Array<{
        field: string;
        text: string;
        indices: [number, number];
    }>;
}

// ==========================================
// Export/Import Commands
// ==========================================

export interface ExportProjectPayload {
    projectPath: string;
    format: 'epub' | 'pdf' | 'docx' | 'html';
    options?: Record<string, unknown>;
}

export interface ImportProjectPayload {
    sourcePath: string;
    destinationPath?: string;
}

// ==========================================
// AI & Settings
// ==========================================

export interface StoreApiKeyPayload {
    provider: string;
    key: string;
}

export interface GetApiKeyPayload {
    provider: string;
}
