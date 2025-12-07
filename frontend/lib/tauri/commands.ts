/**
 * Tauri Commands API Wrapper
 * 
 * This module provides TypeScript interfaces for all Tauri backend commands.
 * Use these instead of IndexedDB repositories when running in Tauri.
 */

import { invoke } from '@tauri-apps/api/core';
import type { CodexEntry } from '@/domain/entities/types';

// ============ Types ============

export interface ProjectMeta {
    id: string;
    title: string;
    author: string;
    description: string;
    path: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface StructureNode {
    id: string;
    type: string;  // "act", "chapter", "scene"
    title: string;
    order: number;
    children: StructureNode[];
    file?: string;  // Only for scenes
}

export interface SceneMeta {
    id: string;
    title: string;
    order: number;
    status: string;
    word_count: number;
    pov_character?: string;
    created_at: string;
    updated_at: string;
}

export interface Scene {
    meta: SceneMeta;
    content: string;
}

// Note: For CodexEntry, use the type from @/domain/entities/types directly
// The Rust backend serializes to match that interface

export interface Snippet {
    id: string;
    title: string;
    content: string;
    pinned: boolean;
    created_at: string;
    updated_at: string;
}

export interface SearchResult {
    type: string;
    file?: string;
    path: string;
}

// ============ Utility ============

/**
 * Check if running in Tauri (desktop app) or browser
 */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}

// ============ Project Commands ============

export async function getProjectsPath(): Promise<string> {
    return invoke<string>('get_projects_path');
}

export async function listProjects(): Promise<ProjectMeta[]> {
    return invoke<ProjectMeta[]>('list_projects');
}

export async function createProject(title: string, author: string, customPath: string): Promise<ProjectMeta> {
    return invoke<ProjectMeta>('create_project', { title, author, customPath });
}

export async function deleteProject(projectPath: string): Promise<void> {
    return invoke('delete_project', { projectPath });
}

export interface ProjectUpdates {
    title?: string;
    author?: string;
    description?: string;
    archived?: boolean;
}

export async function updateProject(projectPath: string, updates: ProjectUpdates): Promise<ProjectMeta> {
    return invoke<ProjectMeta>('update_project', { projectPath, updates });
}

export async function archiveProject(projectPath: string, archived: boolean): Promise<ProjectMeta> {
    return invoke<ProjectMeta>('archive_project', { projectPath, archived });
}

// ============ Structure Commands ============

export async function getStructure(projectPath: string): Promise<StructureNode[]> {
    return invoke<StructureNode[]>('get_structure', { projectPath });
}

export async function saveStructure(projectPath: string, structure: StructureNode[]): Promise<void> {
    return invoke('save_structure', { projectPath, structure });
}

export async function createNode(
    projectPath: string,
    parentId: string | null,
    nodeType: string,
    title: string
): Promise<StructureNode> {
    return invoke<StructureNode>('create_node', {
        projectPath,
        parentId,
        nodeType,
        title
    });
}

// ============ Scene Commands ============

export async function loadScene(projectPath: string, sceneFile: string): Promise<Scene> {
    return invoke<Scene>('load_scene', { projectPath, sceneFile });
}

export async function saveScene(
    projectPath: string,
    sceneFile: string,
    content: string,
    title?: string
): Promise<SceneMeta> {
    return invoke<SceneMeta>('save_scene', { projectPath, sceneFile, content, title });
}

export async function deleteScene(projectPath: string, sceneFile: string): Promise<void> {
    return invoke('delete_scene', { projectPath, sceneFile });
}

// ============ Codex Commands ============

export async function listCodexEntries(
    projectPath: string,
    category?: string
): Promise<CodexEntry[]> {
    return invoke<CodexEntry[]>('list_codex_entries', { projectPath, category });
}

export async function saveCodexEntry(projectPath: string, entry: CodexEntry): Promise<void> {
    return invoke('save_codex_entry', { projectPath, entry });
}

export async function deleteCodexEntry(
    projectPath: string,
    category: string,
    entryId: string
): Promise<void> {
    return invoke('delete_codex_entry', { projectPath, category, entryId });
}

// ============ Snippet Commands ============

export async function listSnippets(projectPath: string): Promise<Snippet[]> {
    return invoke<Snippet[]>('list_snippets', { projectPath });
}

export async function saveSnippet(projectPath: string, snippet: Snippet): Promise<void> {
    return invoke('save_snippet', { projectPath, snippet });
}

export async function deleteSnippet(projectPath: string, snippetId: string): Promise<void> {
    return invoke('delete_snippet', { projectPath, snippetId });
}

// ============ Search Command ============

export async function searchProject(projectPath: string, query: string): Promise<SearchResult[]> {
    return invoke<SearchResult[]>('search_project', { projectPath, query });
}

// ============ Export Commands ============

export interface AppInfo {
    name: string;
    version: string;
    platform: string;
    arch: string;
}

/**
 * Export the full manuscript as a single text/markdown string
 */
export async function exportManuscriptText(projectPath: string): Promise<string> {
    return invoke<string>('export_manuscript_text', { projectPath });
}

/**
 * Export a full project backup as JSON
 */
export async function exportProjectBackup(projectPath: string, outputPath: string): Promise<void> {
    return invoke('export_project_backup', { projectPath, outputPath });
}

/**
 * Get app info (name, version, platform, arch)
 */
export async function getAppInfo(): Promise<AppInfo> {
    return invoke<AppInfo>('get_app_info');
}

// ============ Dialog Helpers ============

import { save as dialogSave, open as dialogOpen } from '@tauri-apps/plugin-dialog';

/**
 * Show a native save dialog
 */
export async function showSaveDialog(options?: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
    title?: string;
}): Promise<string | null> {
    return dialogSave(options);
}

/**
 * Show a native open dialog
 */
export async function showOpenDialog(options?: {
    defaultPath?: string;
    directory?: boolean;
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
    title?: string;
}): Promise<string | string[] | null> {
    return dialogOpen(options);
}
