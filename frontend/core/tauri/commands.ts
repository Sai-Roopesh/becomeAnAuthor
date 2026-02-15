/**
 * Tauri Commands API Wrapper
 *
 * This module provides TypeScript interfaces for all Tauri backend commands.
 * Use these instead of IndexedDB repositories when running in Tauri.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  CodexEntry,
  CodexRelation,
  CodexTag,
  CodexEntryTag,
  ProjectMap,
  WorldEvent,
  ChatThread,
  ChatMessage,
  Series,
  Snippet,
  CodexTemplate,
  CodexRelationType,
  SceneCodexLink,
  Idea,
  SceneNote,
} from "@/domain/entities/types";

// ============ Types ============

export interface ProjectMeta {
  id: string;
  title: string;
  author: string;
  description: string;
  path: string;
  archived: boolean;
  language?: string; // e.g., "English (US)"
  cover_image?: string; // base64 data URL
  series_id: string; // Required - all projects must belong to a series
  series_index: string; // e.g., "Book 1", "Book 2"
  created_at: number;
  updated_at: number;
}

export interface RecentProject {
  path: string;
  title: string;
  lastOpened: number;
}

export interface TrashedProject {
  id: string;
  title: string;
  originalPath: string;
  trashPath: string;
  deletedAt: number;
}

export interface DeletedSeriesMeta {
  oldSeriesId: string;
  title: string;
  deletedAt: number;
}

export interface StructureNode {
  id: string;
  type: string; // "act", "chapter", "scene"
  title: string;
  order: number;
  children: StructureNode[];
  file?: string; // Only for scenes
}

export interface SceneMeta {
  id: string;
  title: string;
  order: number;
  status: string;
  word_count: number;
  pov_character?: string;
  subtitle?: string;
  labels?: string[];
  exclude_from_ai?: boolean;
  summary?: string;
  archived?: boolean;
  created_at: number; // ✅ Changed from string
  updated_at: number; // ✅ Changed from string
}

export interface Scene {
  meta: SceneMeta;
  content: string;
}

// Note: For CodexEntry, use the type from @/domain/entities/types directly
// The Rust backend serializes to match that interface

import type { TiptapContent } from "@/shared/types/tiptap";

// Snippet interface removed in favor of domain type

export interface SearchResult {
  id: string;
  title: string;
  type: "scene" | "codex";
  contentType?: "scene" | "codex";
  snippet?: string;
  score?: number;
  category?: string;
  path: string;
}

// ============ Utility ============

/**
 * Check if running in Tauri (desktop app) or browser
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// ============ Project Commands ============

export async function getProjectsPath(): Promise<string> {
  return invoke<string>("get_projects_path");
}

export async function listProjects(): Promise<ProjectMeta[]> {
  return invoke<ProjectMeta[]>("list_projects");
}

export async function createProject(
  title: string,
  author: string,
  customPath: string,
  seriesId: string,
  seriesIndex: string,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("create_project", {
    title,
    author,
    customPath,
    seriesId,
    seriesIndex,
  });
}

export async function deleteProject(projectPath: string): Promise<void> {
  return invoke("delete_project", { projectPath });
}

export async function listProjectTrash(): Promise<TrashedProject[]> {
  return invoke<TrashedProject[]>("list_project_trash");
}

export async function restoreTrashedProject(
  trashPath: string,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("restore_trashed_project", { trashPath });
}

export async function permanentlyDeleteTrashedProject(
  trashPath: string,
): Promise<void> {
  return invoke("permanently_delete_trashed_project", { trashPath });
}

// ============ Recent Projects Commands ============

/**
 * List recently opened projects (auto-prunes old/invalid entries)
 */
export async function listRecentProjects(): Promise<RecentProject[]> {
  return invoke<RecentProject[]>("list_recent_projects");
}

/**
 * Add a project to the recent list
 */
export async function addToRecent(
  projectPath: string,
  title: string,
): Promise<void> {
  return invoke("add_to_recent", { projectPath, title });
}

/**
 * Remove a project from the recent list
 */
export async function removeFromRecent(projectPath: string): Promise<void> {
  return invoke("remove_from_recent", { projectPath });
}

/**
 * Open a project by path (validates and adds to recent)
 */
export async function openProject(projectPath: string): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("open_project", { projectPath });
}

/**
 * Show file picker dialog to select a project folder
 */
export async function showOpenProjectDialog(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Your Novel",
  });
  return selected as string | null;
}

export interface ProjectUpdates {
  title?: string;
  author?: string;
  description?: string;
  archived?: boolean;
  language?: string;
  cover_image?: string;
  series_id?: string;
  series_index?: string;
}

export async function updateProject(
  projectPath: string,
  updates: ProjectUpdates,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("update_project", { projectPath, updates });
}

export async function archiveProject(
  projectPath: string,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("archive_project", { projectPath });
}

// ============ Structure Commands ============

export async function getStructure(
  projectPath: string,
): Promise<StructureNode[]> {
  return invoke<StructureNode[]>("get_structure", { projectPath });
}

export async function saveStructure(
  projectPath: string,
  structure: StructureNode[],
): Promise<void> {
  return invoke("save_structure", { projectPath, structure });
}

export async function createNode(
  projectPath: string,
  parentId: string | null,
  nodeType: string,
  title: string,
): Promise<StructureNode> {
  return invoke<StructureNode>("create_node", {
    projectPath,
    parentId,
    nodeType,
    title,
  });
}

// ============ Scene Commands ============

export async function loadScene(
  projectPath: string,
  sceneFile: string,
): Promise<Scene> {
  return invoke<Scene>("load_scene", { projectPath, sceneFile });
}

export async function saveScene(
  projectPath: string,
  sceneFile: string,
  content: TiptapContent,
  title?: string,
): Promise<SceneMeta> {
  // Validate content structure before sending to Rust
  if (!content || typeof content !== "object" || !("type" in content)) {
    throw new Error("Invalid Tiptap content structure");
  }
  return invoke<SceneMeta>("save_scene", {
    projectPath,
    sceneFile,
    content,
    title,
  });
}

export async function updateSceneMetadata(
  projectPath: string,
  sceneFile: string,
  updates: Partial<{
    title: string;
    status: string;
    pov: string;
    subtitle: string;
    labels: string[];
    excludeFromAI: boolean;
    summary: string;
    archived: boolean;
  }>,
): Promise<SceneMeta> {
  return invoke<SceneMeta>("update_scene_metadata", {
    projectPath,
    sceneFile,
    updates,
  });
}

export async function deleteScene(
  projectPath: string,
  sceneFile: string,
): Promise<void> {
  return invoke("delete_scene", { projectPath, sceneFile });
}

// ============ Scene Note Commands ============

export async function getSceneNote(
  projectPath: string,
  sceneId: string,
): Promise<SceneNote | null> {
  return invoke<SceneNote | null>("get_scene_note", { projectPath, sceneId });
}

export async function saveSceneNote(
  projectPath: string,
  note: SceneNote,
): Promise<void> {
  return invoke("save_scene_note", { projectPath, note });
}

export async function deleteSceneNote(
  projectPath: string,
  sceneId: string,
): Promise<void> {
  return invoke("delete_scene_note", { projectPath, sceneId });
}

// ==========================================
// Codex Commands
// ==========================================

export async function listCodexEntries(
  projectPath: string,
  category?: string,
): Promise<CodexEntry[]> {
  return invoke<CodexEntry[]>("list_codex_entries", { projectPath, category });
}

export async function saveCodexEntry(
  projectPath: string,
  entry: CodexEntry,
): Promise<void> {
  return invoke("save_codex_entry", { projectPath, entry });
}

export async function deleteCodexEntry(
  projectPath: string,
  category: string,
  entryId: string,
): Promise<void> {
  return invoke("delete_codex_entry", { projectPath, category, entryId });
}

// ==========================================
// Codex Relations
// ==========================================

export async function listCodexRelations(
  projectPath: string,
): Promise<CodexRelation[]> {
  return invoke<CodexRelation[]>("list_codex_relations", { projectPath });
}

export async function saveCodexRelation(
  projectPath: string,
  relation: CodexRelation,
): Promise<void> {
  return invoke("save_codex_relation", { projectPath, relation });
}

export async function deleteCodexRelation(
  projectPath: string,
  relationId: string,
): Promise<void> {
  return invoke("delete_codex_relation", { projectPath, relationId });
}

// ==========================================
// Codex Tags
// ==========================================

export async function listCodexTags(projectPath: string): Promise<CodexTag[]> {
  return invoke<CodexTag[]>("list_codex_tags", { projectPath });
}

export async function saveCodexTag(
  projectPath: string,
  tag: CodexTag,
): Promise<void> {
  return invoke("save_codex_tag", { projectPath, tag });
}

export async function deleteCodexTag(
  projectPath: string,
  tagId: string,
): Promise<void> {
  return invoke("delete_codex_tag", { projectPath, tagId });
}

export async function listCodexEntryTags(
  projectPath: string,
): Promise<CodexEntryTag[]> {
  return invoke<CodexEntryTag[]>("list_codex_entry_tags", { projectPath });
}

export async function saveCodexEntryTag(
  projectPath: string,
  entryTag: CodexEntryTag,
): Promise<void> {
  return invoke("save_codex_entry_tag", { projectPath, entryTag });
}

export async function deleteCodexEntryTag(
  projectPath: string,
  entryTagId: string,
): Promise<void> {
  return invoke("delete_codex_entry_tag", { projectPath, entryTagId });
}

// ============ Idea Commands ============

export async function listIdeas(projectPath: string): Promise<Idea[]> {
  return invoke<Idea[]>("list_ideas", { projectPath });
}

export async function createIdea(
  projectPath: string,
  idea: Idea,
): Promise<Idea> {
  return invoke<Idea>("create_idea", { projectPath, idea });
}

export async function updateIdea(
  projectPath: string,
  idea: Idea,
): Promise<Idea> {
  return invoke<Idea>("update_idea", { projectPath, idea });
}

export async function deleteIdea(
  projectPath: string,
  ideaId: string,
): Promise<void> {
  return invoke("delete_idea", { projectPath, ideaId });
}

// ============ Codex Templates ============

// CodexTemplate interface removed in favor of domain type

export async function listCodexTemplates(
  projectPath: string,
): Promise<CodexTemplate[]> {
  return invoke<CodexTemplate[]>("list_codex_templates", { projectPath });
}

export async function saveCodexTemplate(
  projectPath: string,
  template: CodexTemplate,
): Promise<void> {
  return invoke("save_codex_template", { projectPath, template });
}

export async function deleteCodexTemplate(
  projectPath: string,
  templateId: string,
): Promise<void> {
  return invoke("delete_codex_template", { projectPath, templateId });
}

// ============ Codex Relation Types ============

// CodexRelationType interface removed in favor of domain type

export async function listCodexRelationTypes(
  projectPath: string,
): Promise<CodexRelationType[]> {
  return invoke<CodexRelationType[]>("list_codex_relation_types", {
    projectPath,
  });
}

export async function saveCodexRelationType(
  projectPath: string,
  relationType: CodexRelationType,
): Promise<void> {
  return invoke("save_codex_relation_type", { projectPath, relationType });
}

export async function deleteCodexRelationType(
  projectPath: string,
  typeId: string,
): Promise<void> {
  return invoke("delete_codex_relation_type", { projectPath, typeId });
}

// ============ Scene-Codex Links ============

// SceneCodexLink interface removed in favor of domain type

export async function listSceneCodexLinks(
  projectPath: string,
): Promise<SceneCodexLink[]> {
  return invoke<SceneCodexLink[]>("list_scene_codex_links", { projectPath });
}

export async function saveSceneCodexLink(
  projectPath: string,
  link: SceneCodexLink,
): Promise<void> {
  return invoke("save_scene_codex_link", { projectPath, link });
}

export async function deleteSceneCodexLink(
  projectPath: string,
  linkId: string,
): Promise<void> {
  return invoke("delete_scene_codex_link", { projectPath, linkId });
}

// ============ Chat Commands ============

// Chat Types now imported from domain/entities/types

export async function listChatThreads(
  projectPath: string,
): Promise<ChatThread[]> {
  return invoke<ChatThread[]>("list_chat_threads", { projectPath });
}

export async function getChatThread(
  projectPath: string,
  threadId: string,
): Promise<ChatThread | null> {
  return invoke<ChatThread | null>("get_chat_thread", {
    projectPath,
    threadId,
  });
}

export async function createChatThread(
  projectPath: string,
  thread: Omit<ChatThread, "id" | "createdAt" | "updatedAt">,
): Promise<ChatThread> {
  return invoke<ChatThread>("create_chat_thread", { projectPath, thread });
}

export async function updateChatThread(
  projectPath: string,
  thread: ChatThread,
): Promise<void> {
  return invoke("update_chat_thread", { projectPath, thread });
}

export async function deleteChatThread(
  projectPath: string,
  threadId: string,
): Promise<void> {
  return invoke("delete_chat_thread", { projectPath, threadId });
}

export async function getChatMessages(
  projectPath: string,
  threadId: string,
): Promise<ChatMessage[]> {
  return invoke<ChatMessage[]>("get_chat_messages", { projectPath, threadId });
}

export async function createChatMessage(
  projectPath: string,
  message: ChatMessage,
): Promise<ChatMessage> {
  return invoke<ChatMessage>("create_chat_message", { projectPath, message });
}

export async function updateChatMessage(
  projectPath: string,
  threadId: string,
  message: ChatMessage,
): Promise<void> {
  return invoke("update_chat_message", { projectPath, threadId, message });
}

export async function deleteChatMessage(
  projectPath: string,
  threadId: string,
  messageId: string,
): Promise<void> {
  return invoke("delete_chat_message", { projectPath, threadId, messageId });
}

// ============ Series Commands ============

// Series interface removed in favor of domain type

export async function listSeries(): Promise<Series[]> {
  return invoke<Series[]>("list_series");
}

export async function createSeries(
  series: Omit<Series, "id" | "createdAt" | "updatedAt">,
): Promise<Series> {
  return invoke<Series>("create_series", {
    title: series.title,
    description: series.description,
    author: series.author,
    genre: series.genre,
    status: series.status,
  });
}

export async function updateSeries(
  seriesId: string,
  updates: Partial<Series>,
): Promise<void> {
  return invoke("update_series", { seriesId, updates });
}

export async function deleteSeries(seriesId: string): Promise<void> {
  return invoke("delete_series", { seriesId });
}

/**
 * Delete a series and cascade delete all projects belonging to it.
 * All projects are moved to Trash before the series is deleted.
 * @returns number of projects deleted
 */
export async function deleteSeriesCascade(seriesId: string): Promise<number> {
  return invoke<number>("delete_series_cascade", { seriesId });
}

export async function listDeletedSeries(): Promise<DeletedSeriesMeta[]> {
  return invoke<DeletedSeriesMeta[]>("list_deleted_series");
}

export async function restoreDeletedSeries(
  oldSeriesId: string,
): Promise<Series> {
  return invoke<Series>("restore_deleted_series", { oldSeriesId });
}

export async function permanentlyDeleteDeletedSeries(
  oldSeriesId: string,
): Promise<void> {
  return invoke("permanently_delete_deleted_series", { oldSeriesId });
}

// ============ Series Codex Commands ============

/**
 * List all codex entries for a series
 */
export async function listSeriesCodexEntries(
  seriesId: string,
  category?: string,
): Promise<CodexEntry[]> {
  return invoke<CodexEntry[]>("list_series_codex_entries", {
    seriesId,
    category,
  });
}

/**
 * Get a single codex entry by ID
 */
export async function getSeriesCodexEntry(
  seriesId: string,
  entryId: string,
): Promise<CodexEntry | null> {
  return invoke<CodexEntry | null>("get_series_codex_entry", {
    seriesId,
    entryId,
  });
}

/**
 * Save a codex entry to series storage
 */
export async function saveSeriesCodexEntry(
  seriesId: string,
  entry: CodexEntry,
): Promise<void> {
  return invoke("save_series_codex_entry", { seriesId, entry });
}

/**
 * Delete a codex entry from series storage
 */
export async function deleteSeriesCodexEntry(
  seriesId: string,
  entryId: string,
  category: string,
): Promise<void> {
  return invoke("delete_series_codex_entry", { seriesId, entryId, category });
}

/**
 * List all codex relations for a series
 */
export async function listSeriesCodexRelations(
  seriesId: string,
): Promise<CodexRelation[]> {
  return invoke<CodexRelation[]>("list_series_codex_relations", { seriesId });
}

/**
 * Save a codex relation to series storage
 */
export async function saveSeriesCodexRelation(
  seriesId: string,
  relation: CodexRelation,
): Promise<void> {
  return invoke("save_series_codex_relation", { seriesId, relation });
}

/**
 * Delete a codex relation from series storage
 */
export async function deleteSeriesCodexRelation(
  seriesId: string,
  relationId: string,
): Promise<void> {
  return invoke("delete_series_codex_relation", { seriesId, relationId });
}

// ============ Snippet Commands ============

export async function listSnippets(projectPath: string): Promise<Snippet[]> {
  return invoke<Snippet[]>("list_snippets", { projectPath });
}

export async function saveSnippet(
  projectPath: string,
  snippet: Snippet,
): Promise<void> {
  return invoke("save_snippet", { projectPath, snippet });
}

export async function deleteSnippet(
  projectPath: string,
  snippetId: string,
): Promise<void> {
  return invoke("delete_snippet", { projectPath, snippetId });
}

// ============ Search Command ============

export async function searchProject(
  projectPath: string,
  query: string,
  scope?: "all" | "scenes" | "codex",
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("search_project", {
    projectPath,
    query,
    ...(scope ? { scope } : {}),
  });
}

// ============ Map Commands ============

export async function listMaps(projectPath: string): Promise<ProjectMap[]> {
  return invoke<ProjectMap[]>("list_maps", { projectPath });
}

export async function saveMap(
  projectPath: string,
  map: ProjectMap,
): Promise<void> {
  return invoke("save_map", { projectPath, map });
}

export async function deleteMap(
  projectPath: string,
  mapId: string,
): Promise<void> {
  return invoke("delete_map", { projectPath, mapId });
}

export async function uploadMapImage(
  projectPath: string,
  mapId: string,
  imageData: number[],
  fileName: string,
): Promise<string> {
  return invoke<string>("upload_map_image", {
    projectPath,
    mapId,
    imageData,
    fileName,
  });
}

// ============ World Timeline Commands ============

export async function listWorldEvents(
  projectPath: string,
): Promise<WorldEvent[]> {
  return invoke<WorldEvent[]>("list_world_events", { projectPath });
}

export async function saveWorldEvent(
  projectPath: string,
  event: WorldEvent,
): Promise<void> {
  return invoke("save_world_event", { projectPath, event });
}

export async function deleteWorldEvent(
  projectPath: string,
  eventId: string,
): Promise<void> {
  return invoke("delete_world_event", { projectPath, eventId });
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
export async function exportManuscriptText(
  projectPath: string,
): Promise<string> {
  return invoke<string>("export_manuscript_text", { projectPath });
}

/**
 * Export a full project backup as JSON
 */
export async function exportProjectBackup(
  projectPath: string,
  outputPath: string,
): Promise<void> {
  return invoke("export_project_backup", { projectPath, outputPath });
}

/**
 * Export a full series backup as JSON file
 */
export async function exportSeriesBackup(
  seriesId: string,
  outputPath?: string | null,
): Promise<string> {
  return invoke<string>("export_series_backup", { seriesId, outputPath });
}

/**
 * Export series backup as JSON string (for cloud backup services)
 */
export async function exportSeriesAsJson(seriesId: string): Promise<string> {
  return invoke<string>("export_series_as_json", { seriesId });
}

/**
 * Export project as JSON string (for cloud backup services like Google Drive)
 */
export async function exportProjectAsJson(
  projectPath: string,
): Promise<string> {
  return invoke<string>("export_project_as_json", { projectPath });
}

export interface ImportSeriesResult {
  seriesId: string;
  seriesTitle: string;
  projectIds: string[];
  importedProjectCount: number;
}

/**
 * Import a series backup file
 */
export async function importSeriesBackup(
  backupJson: string,
): Promise<ImportSeriesResult> {
  return invoke<ImportSeriesResult>("import_series_backup", { backupJson });
}

/**
 * Export manuscript as DOCX document
 */
export async function exportManuscriptDocx(
  projectPath: string,
  outputPath: string,
): Promise<string> {
  return invoke<string>("export_manuscript_docx", { projectPath, outputPath });
}

/**
 * Export manuscript as ePub eBook
 */
export async function exportManuscriptEpub(
  projectPath: string,
  outputPath: string,
  title?: string,
  author?: string,
  language?: string,
): Promise<string> {
  return invoke<string>("export_manuscript_epub", {
    projectPath,
    outputPath,
    title,
    author,
    language,
  });
}

/**
 * Get app info (name, version, platform, arch)
 */
export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("get_app_info");
}

// ============ Dialog Helpers ============

import {
  save as dialogSave,
  open as dialogOpen,
} from "@tauri-apps/plugin-dialog";

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

// ============ Export Preset Commands ============

import type { ExportPreset } from "@/domain/types/export-types";

/**
 * List custom user export presets
 */
export async function listCustomPresets(): Promise<ExportPreset[]> {
  return invoke<ExportPreset[]>("list_custom_presets");
}

/**
 * Save a custom user export preset
 */
export async function saveCustomPreset(preset: ExportPreset): Promise<void> {
  return invoke("save_custom_preset", { preset });
}

/**
 * Delete a custom user export preset
 */
export async function deleteCustomPreset(presetId: string): Promise<void> {
  return invoke("delete_custom_preset", { presetId });
}
