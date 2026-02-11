# Become An Author - Complete Feature Audit

> **Document Generated**: December 21, 2025  
> **Last Updated**: February 5, 2026  
> **Project**: Become An Author - Local-first, AI-assisted desktop application for novelists

---

## Executive Summary

"Become An Author" is a comprehensive desktop writing application built with a **Tauri v2 Rust backend** and **Next.js 16 React frontend**. The application provides novelists with a complete suite of tools for manuscript creation, world-building, AI assistance, and project management.

This audit covers **every feature** across the following categories:
- 🏗️ **Project & Structure Management**
- ✍️ **Scene Editor & Writing Tools**
- 📚 **Codex (World-Building Wiki)**
- 🤖 **AI Integration & Chat**
- 📊 **Analysis & Review**
- 📋 **Planning & Organization**
- 🔍 **Search & Navigation**
- 💾 **Data Management & Backup**
- ⚙️ **Settings & Configuration**
- 🔐 **Security & Storage**

---

## Table of Contents

1. [Project & Structure Management](#1-project--structure-management)
2. [Scene Editor & Writing Tools](#2-scene-editor--writing-tools)
3. [Codex - World-Building System](#3-codex---world-building-system)
4. [AI Integration & Chat](#4-ai-integration--chat)
5. [Story Analysis & Review](#5-story-analysis--review)
6. [Planning & Organization](#6-planning--organization)
7. [Search & Navigation](#7-search--navigation)
8. [Data Management & Backup](#8-data-management--backup)
9. [Settings & Configuration](#9-settings--configuration)
10. [Security & API Key Management](#10-security--api-key-management)
11. [Collaboration Features](#11-collaboration-features)
12. [UI Components Library](#12-ui-components-library)
13. [Developer Tools & Quality](#13-developer-tools--quality)
14. [Technical Architecture](#14-technical-architecture)

---

## 1. Project & Structure Management

### 1.1 Project CRUD Operations

| Feature | Backend Command | Frontend Location | Description |
|---------|-----------------|-------------------|-------------|
| **List Projects** | `list_projects` | `TauriProjectRepository` | Retrieve all projects from the projects directory |
| **Create Project** | `create_project(title, author, custom_path)` | `TauriProjectRepository` | Create new project with folder structure, metadata, and seed data |
| **Delete Project** | `delete_project(project_path)` | `TauriProjectRepository` | Permanently remove project and all contents |
| **Update Project** | `update_project(project_path, updates)` | `TauriProjectRepository` | Update project title, author, settings |
| **Archive Project** | `archive_project(project_path)` | `TauriProjectRepository` | Mark project as archived (soft archive) |
| **Get Projects Path** | `get_projects_path` | N/A | Return the default projects directory path |

### 1.2 Manuscript Structure

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Get Structure** | `get_structure(project_path)` | Load hierarchical outline (Acts → Chapters → Scenes) |
| **Save Structure** | `save_structure(project_path, structure)` | Persist structure changes to `structure.json` |
| **Create Node** | `create_node(project_path, node_type, title, parent_id)` | Create new Act, Chapter, or Scene |
| **Rename Node** | `rename_node(project_path, node_id, new_title)` | Update node title in structure |
| **Delete Node** | `delete_node(project_path, node_id)` | Remove node and all children, delete associated scene files |

### 1.3 Node Types

- **Act**: Top-level structural division
- **Chapter**: Second-level grouping under Acts
- **Scene**: Leaf nodes containing actual content (stored as Markdown files)

### 1.4 Series Management

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Series** | `list_series` | Get all series definitions |
| **Create Series** | `create_series(title)` | Create new book series |
| **Update Series** | `update_series(series_id, updates)` | Modify series metadata |
| **Delete Series** | `delete_series(series_id)` | Remove series definition |

**Frontend Components:**
- `CreateSeriesDialog.tsx` - Modal for creating new series
- `EditSeriesDialog.tsx` - Modal for editing series details
- `SeriesCard.tsx` - Display card for series
- `SeriesList.tsx` - List view of all series

---

## 2. Scene Editor & Writing Tools

### 2.1 Rich Text Editor

**Technology**: Tiptap (ProseMirror wrapper)

| Feature | Implementation | Description |
|---------|---------------|-------------|
| **Basic Formatting** | `@tiptap/starter-kit` | Bold, italic, headings, lists, blockquotes |
| **Typography** | `@tiptap/extension-typography` | Smart quotes, em-dashes, ellipses |
| **Character Count** | `@tiptap/extension-character-count` | Real-time word/character counts |
| **Placeholder** | `@tiptap/extension-placeholder` | Placeholder text for empty editor |
| **Mentions** | `@tiptap/extension-mention` | @mention codex entries inline |
| **Bubble Menu** | `@tiptap/extension-bubble-menu` | Context menu on text selection |
| **Collaboration** | `@tiptap/extension-collaboration` | Yjs integration for real-time editing |

### 2.2 Scene Management

| Feature | Backend Command | Frontend Hook | Description |
|---------|-----------------|---------------|-------------|
| **Load Scene** | `load_scene(project_path, scene_file)` | `TauriNodeRepository` | Load scene with YAML frontmatter + content |
| **Save Scene** | `save_scene(project_path, scene_file, content, title)` | `EditorStateManager` | Debounced save orchestration with dirty-state tracking |
| **Save by ID** | `save_scene_by_id(project_path, scene_id, content)` | `saveCoordinator` | Serialized per-scene writes + emergency backup fallback |
| **Delete Scene** | `delete_scene(project_path, scene_file)` | N/A | Remove scene file |

### 2.3 Editor Components

| Component | File | Description |
|-----------|------|-------------|
| **EditorContainer** | `EditorContainer.tsx` | Main editor wrapper |
| **TiptapEditor** | `tiptap-editor.tsx` (18KB) | Core Tiptap editor implementation |
| **EditorToolbar** | `editor-toolbar.tsx` | Formatting toolbar |
| **FormatMenu** | `format-menu.tsx` | Text formatting dropdown |
| **TextSelectionMenu** | `text-selection-menu.tsx` | Context menu on selection |
| **MentionList** | `mention-list.tsx` | @mention autocomplete dropdown |
| **NodeActionsMenu** | `NodeActionsMenu.tsx` | Scene/chapter actions |
| **StoryTimeline** | `story-timeline.tsx` | Visual timeline of scenes |
| **SectionComponent** | `section-component.tsx` | Scene section dividers |
| **TextReplaceDialog** | `text-replace-dialog.tsx` (17KB) | Find and replace functionality |
| **FocusModeToggle** | `FocusModeToggle.tsx` | Distraction-free writing mode |

### 2.4 AI Writing Assistance

| Component | File | Description |
|-----------|------|-------------|
| **ContinueWritingMenu** | `continue-writing-menu.tsx` (12KB) | AI-powered text continuation |
| **TextSelectionMenu** | `text-selection-menu.tsx` | AI-powered expand/rephrase/shorten actions |
| **TweakGenerateDialog** | `tweak-generate-dialog.tsx` (10KB) | Fine-tune AI generation parameters |
| **TinkerMode** | `tinker-mode.tsx` | Experimental AI writing features |

### 2.5 Auto-Save System

**Core**: `EditorStateManager` + `save-coordinator.ts`

| Feature | Description |
|---------|-------------|
| **Debounced Saves** | Debounces editor updates (default 500ms via `TIMING.SAVE_DEBOUNCE_MS`) |
| **Per-Scene Queue** | Serializes concurrent saves per scene to prevent race conditions |
| **Emergency Backup** | Primary Tauri backup + localStorage fallback on save failures |
| **Save Status** | Exposes `saved/saving/unsaved/error` state to UI (`SaveStatusIndicator`) |

### 2.6 Slash Commands

**Location**: `frontend/lib/tiptap-extensions/`

- `slash-commands.ts` - Slash command extension
- `slash-commands-list.tsx` - Command palette UI
- `section-node.ts` - Custom section nodes

---

## 3. Codex - World-Building System

### 3.1 Codex Entry Management

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Entries** | `list_codex_entries(project_path)` | Get all codex entries across categories |
| **Save Entry** | `save_codex_entry(project_path, entry)` | Create or update codex entry |
| **Delete Entry** | `delete_codex_entry(project_path, entry_id, category)` | Remove codex entry |

### 3.2 Codex Categories

- **Characters** - People in your story
- **Locations** - Places and settings
- **Items** - Objects and artifacts
- **Lore** - History, mythology, rules
- **Subplots** - Story threads and arcs

### 3.3 Relationship System

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Relations** | `list_codex_relations(project_path)` | Get all entry relationships |
| **Save Relation** | `save_codex_relation(project_path, relation)` | Create/update relationship |
| **Delete Relation** | `delete_codex_relation(project_path, relation_id)` | Remove relationship |
| **List Relation Types** | `list_codex_relation_types(project_path)` | Get available relationship types |
| **Save Relation Type** | `save_codex_relation_type(project_path, type)` | Create custom relationship types |
| **Delete Relation Type** | `delete_codex_relation_type(project_path, type_id)` | Remove relationship type |

**Built-in Relation Types:**
- Friend, Enemy, Family, Romantic Partner
- Mentor/Mentee, Rival
- Located In, Owns

### 3.4 Tag System

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Tags** | `list_codex_tags(project_path)` | Get all tags |
| **Save Tag** | `save_codex_tag(project_path, tag)` | Create/update tag with color |
| **Delete Tag** | `delete_codex_tag(project_path, tag_id)` | Remove tag |
| **List Entry Tags** | `list_codex_entry_tags(project_path)` | Get tag-entry associations |
| **Save Entry Tag** | `save_codex_entry_tag(project_path, entry_tag)` | Tag an entry |
| **Delete Entry Tag** | `delete_codex_entry_tag(project_path, entry_tag_id)` | Untag an entry |

### 3.5 Template System

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Templates** | `list_codex_templates(project_path)` | Get all templates |
| **Save Template** | `save_codex_template(project_path, template)` | Create/update template |
| **Delete Template** | `delete_codex_template(project_path, template_id)` | Remove template |

**Built-in Templates:**
- **Basic Character**: Age, Personality, Backstory, Motivation, Appearance
- **Basic Location**: Description, Atmosphere, Inhabitants
- **Basic Item**: Type, Value/Importance, Description

### 3.6 Scene-Codex Linking

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Scene Links** | `list_scene_codex_links(project_path)` | Get all scene-codex associations |
| **Save Scene Link** | `save_scene_codex_link(project_path, link)` | Link codex entry to scene |
| **Delete Scene Link** | `delete_scene_codex_link(project_path, link_id)` | Remove link |

### 3.7 Mention Tracking

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Find Mentions** | `find_mentions(project_path, codex_entry_id)` | Find all mentions of entry in manuscript |
| **Count Mentions** | `count_mentions(project_path, codex_entry_id)` | Count mentions |

### 3.8 Codex Components

| Component | File | Description |
|-----------|------|-------------|
| **CodexList** | `codex-list.tsx` | Main list view |
| **EntityEditor** | `entity-editor.tsx` | Entry editing form |
| **DetailsTab** | `details-tab.tsx` | Entry details view |
| **RelationsTab** | `relations-tab.tsx` | Relationship graph |
| **MentionsTab** | `mentions-tab.tsx` | Mention tracking view |
| **ResearchTab** | `research-tab.tsx` | Research notes |
| **TrackingTab** | `tracking-tab.tsx` | Entry appearance tracking |
| **TagManager** | `tag-manager.tsx` | Tag management interface |
| **TemplateSelector** | `template-selector.tsx` | Template picker |
| **TemplateFieldRenderer** | `template-field-renderer.tsx` | Dynamic form fields |

### 3.9 Character Arc Points

**Domain Types** (`types.ts`):
- `ArcPoint` - Tracks character evolution over time
- `KnowledgeState` - What character knows/believes
- `EmotionalState` - Primary emotion, mental state, trauma
- `GoalsAndMotivations` - Goals, fears, desires, obstacles

---

## 4. AI Integration & Chat

### 4.1 AI Providers

**Supported Providers** (`ai-vendors.ts`):

| Provider | API Endpoint | Key Format |
|----------|-------------|------------|
| **OpenRouter** | `https://openrouter.ai/api/v1` | `sk-or-v1-...` |
| **Google AI Studio** | `https://generativelanguage.googleapis.com/v1beta` | `AIza...` |
| **Anthropic** | `https://api.anthropic.com/v1` | `sk-ant-...` |
| **Mistral AI** | `https://api.mistral.ai/v1` | Bearer token |
| **OpenAI Compatible** | Custom endpoint | Optional |
| **Kimi (Moonshot)** | `https://api.moonshot.cn/v1` | Bearer token |

**Models Supported:**
- OpenRouter: Access to 100+ models
- Google: Gemini 2.0, 2.5, 3.x families
- Anthropic: Claude 3.5 Sonnet/Haiku, Claude 3 Opus
- Mistral: Large, Medium, Small, Nemo
- OpenAI: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo

### 4.2 Chat System

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Threads** | `list_chat_threads(project_path)` | Get all chat conversations |
| **Get Thread** | `get_chat_thread(project_path, thread_id)` | Get specific thread |
| **Create Thread** | `create_chat_thread(project_path, thread)` | Start new conversation |
| **Update Thread** | `update_chat_thread(project_path, thread)` | Update thread settings |
| **Delete Thread** | `delete_chat_thread(project_path, thread_id)` | Remove thread and messages |
| **Get Messages** | `get_chat_messages(project_path, thread_id)` | Get messages in thread |
| **Create Message** | `create_chat_message(project_path, message)` | Add message to thread |
| **Delete Message** | `delete_chat_message(project_path, thread_id, message_id)` | Remove message |

### 4.3 AI Hooks

| Hook | File | Description |
|------|------|-------------|
| **useAI** | `use-ai.ts` | Unified AI generation with streaming |
| **useContextAssembly** | `use-context-assembly.ts` | Build context from scenes/codex |

**useAI Features:**
- Model selection and persistence
- Streaming responses with cancellation
- Token counting via tiktoken (WASM)
- Error handling and formatting
- Configurable system prompts

**Context Assembly Features:**
- Load scenes, acts, chapters by ID
- Full novel or outline mode
- Codex entry context
- Result caching with LRU eviction
- Support for custom context items

### 4.4 Chat Components

| Component | File | Description |
|-----------|------|-------------|
| **ChatInterface** | `chat-interface.tsx` (10KB) | Full chat UI with sidebar |
| **ChatThread** | `chat-thread.tsx` (11KB) | Main coordinator with streaming via `useAI` |
| **ChatMessage** | `chat-message.tsx` (13KB) | Individual message rendering |
| **ChatInput** | `chat-input.tsx` | Message input with submit |
| **ChatControls** | `chat-controls.tsx` | Thread management controls |
| **ChatHeader** | `chat-header.tsx` | Thread header/title |
| **ChatMessageList** | `chat-message-list.tsx` | Scrollable message list |
| **ChatSettingsDialog** | `chat-settings-dialog.tsx` | Thread-specific settings |
| **PromptSelector** | `prompt-selector.tsx` | System prompt templates |

### 4.5 AI Components

| Component | File | Description |
|-----------|------|-------------|
| **ModelSelector** | `model-selector.tsx` | AI model dropdown with dynamic discovery |

---

## 5. Story Analysis & Review

### 5.1 Analysis System

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Analyses** | `list_analyses(project_path)` | Get all saved analyses |
| **Save Analysis** | `save_analysis(project_path, analysis)` | Store analysis result |
| **Delete Analysis** | `delete_analysis(project_path, analysis_id)` | Remove analysis |

### 5.2 Analysis Types

- **Synopsis** - Story summary generation
- **Plot Threads** - Track narrative threads
- **Character Arcs** - Analyze character development
- **Timeline** - Chronological event tracking
- **Contradictions** - Find inconsistencies
- **Foreshadowing** - Track setup/payoff patterns

### 5.3 Analysis Components

| Component | File | Description |
|-----------|------|-------------|
| **ReviewDashboard** | `ReviewDashboard.tsx` (12KB) | Main analysis dashboard |
| **AnalysisDetailDialog** | `AnalysisDetailDialog.tsx` (28KB) | Detailed analysis view |
| **AnalysisRunDialog** | `AnalysisRunDialog.tsx` (11KB) | Run new analysis |
| **ManuscriptTreeSelector** | `ManuscriptTreeSelector.tsx` | Select analysis scope |
| **VersionWarning** | `VersionWarning.tsx` | Stale analysis warning |

### 5.4 Analysis Hooks

| Hook | File | Description |
|------|------|-------------|
| **useAnalysisRunner** | `use-analysis-runner.ts` | Execute analyses |
| **useAnalysisRepository** | `use-analysis-repository.ts` | Data access |
| **useAnalysisDelete** | `use-analysis-delete.ts` | Delete with confirmation |
| **useManuscriptNodes** | `use-manuscript-nodes.ts` | Get nodes for analysis |
| **useManuscriptVersion** | `use-manuscript-version.ts` | Track manuscript changes |

### 5.5 Analysis Result Types

**StoryAnalysis** (`types.ts`):
- ID, project ID, analysis type
- Title, summary, content
- Insights with severity levels
- Metrics (custom per type)
- Token usage tracking
- Word count at analysis time
- Model used

**AnalysisInsight**:
- Type: positive, neutral, warning, error
- Category: plot, character, timeline, pacing, world-building, dialogue
- Severity: 1-3
- Scene references
- Auto-suggest fixes
- Dismissed/resolved status

---

## 6. Planning & Organization

### 6.1 Plan Views

| Component | File | Description |
|-----------|------|-------------|
| **PlanView** | `plan-view.tsx` | Main planning interface |
| **OutlineView** | `outline-view.tsx` (14KB) | Hierarchical outline |
| **GridView** | `grid-view.tsx` (12KB) | Card-based grid layout |
| **MatrixView** | `matrix-view.tsx` (9KB) | Character/scene matrix |
| **TimelineView** | `timeline-view.tsx` (17KB) | Visual timeline |
| **SceneCard** | `scene-card.tsx` | Individual scene card |
| **SceneCodexBadges** | `scene-codex-badges.tsx` | Codex links on scenes |
| **SceneLinkPanel** | `scene-link-panel.tsx` (13KB) | Manage scene-codex links |
| **CodexFilterBar** | `codex-filter-bar.tsx` (12KB) | Filter by codex entries |

### 6.2 Snippets System

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Snippets** | `list_snippets(project_path)` | Get all reusable text blocks |
| **Save Snippet** | `save_snippet(project_path, snippet)` | Create/update snippet |
| **Delete Snippet** | `delete_snippet(project_path, snippet_id)` | Remove snippet |

**Snippet Components:**
- `snippet-editor.tsx` - Edit snippet content
- `snippet-list.tsx` - List all snippets

### 6.3 Scene Properties

Scenes support the following metadata:
- **POV Character** - Point of view character
- **Status**: Draft / Revised / Final
- **Labels** - Custom tags
- **Beats** - Story beats checklist
- **excludeFromAI** - Exclude from AI context
- **Summary** - Scene synopsis

---

## 7. Search & Navigation

### 7.1 Full-Text Search

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Search Project** | `search_project(project_path, query)` | Search scenes + codex |

**Implementation:**
- Case-insensitive matching
- Searches Markdown content in `manuscript/`
- Searches JSON content in `codex/`
- Returns file references with paths

### 7.2 Client-Side Search

**Library**: Fuse.js (fuzzy search)

**File**: `frontend/lib/search-service.ts`

- Fuzzy matching with configurable threshold
- Searches across titles, content, names
- Returns ranked results

### 7.3 Search Components

| Component | File | Description |
|-----------|------|-------------|
| **SearchPalette** | `SearchPalette.tsx` | Command palette (⌘K) |
| **SearchInput** | `SearchInput.tsx` | Search input field |
| **SearchResults** | `SearchResults.tsx` | Results list |
| **SearchResultItem** | `SearchResultItem.tsx` | Individual result |
| **SearchEmptyState** | `SearchEmptyState.tsx` | No results message |

### 7.4 Navigation Components

| Component | File | Description |
|-----------|------|-------------|
| **ProjectNavigation** | `ProjectNavigation.tsx` (10KB) | Main sidebar navigation |
| **TopNavigation** | `TopNavigation.tsx` | Top navigation bar |

---

## 8. Data Management & Backup

### 8.1 Emergency Backups

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Save Backup** | `save_emergency_backup(backup)` | Auto-save draft to app data |
| **Get Backup** | `get_emergency_backup(scene_id)` | Retrieve backup |
| **Delete Backup** | `delete_emergency_backup(backup_id)` | Remove backup |
| **Cleanup Backups** | `cleanup_emergency_backups` | Remove expired (24h) backups |

### 8.2 Export Features

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Export Text** | `export_manuscript_text(project_path)` | Export as plain text |
| **Export DOCX** | `export_manuscript_docx(project_path, output_path)` | Export as Word document |
| **Export EPUB** | `export_manuscript_epub(project_path, output_path)` | Export as eBook format |
| **Export Backup** | `export_project_backup(project_path, output_path)` | Full JSON backup |
| **Export as JSON** | `export_project_as_json(project_path)` | JSON string for cloud services |
| **Write Export File** | `write_export_file(path, content)` | Write exported content to file |

**DOCX/EPUB Export:**
- Preserves heading hierarchy (Act/Chapter/Scene)
- Extracts plain text from Tiptap JSON
- Uses `docx` Rust crate for DOCX

### 8.2.1 Custom Export Presets

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **List Presets** | `list_custom_presets` | Get all saved export presets |
| **Save Preset** | `save_custom_preset(preset)` | Create/update export preset |
| **Delete Preset** | `delete_custom_preset(preset_id)` | Remove export preset |

**Frontend Hook**: `use-export-presets.ts`

**Preset Options:**
- Page size and margins
- Font family and size  
- Chapter/scene formatting
- Include/exclude codex entries

### 8.3 Import Features

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Import Backup** | `import_project_backup(backup_json)` | Restore from JSON backup |

**Validation:**
- Uses Zod schema (`ExportedProjectSchema`)
- Validates project, nodes, codex, chats, relations

### 8.4 Trash System (Soft Delete)

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Move to Trash** | `move_to_trash(project_path, item_id, item_type, trash_meta)` | Soft delete |
| **Restore** | `restore_from_trash(project_path, item_id, item_type)` | Restore item |
| **List Trash** | `list_trash(project_path)` | Get trashed items |
| **Permanent Delete** | `permanent_delete(project_path, item_id, item_type)` | Hard delete |
| **Empty Trash** | `empty_trash(project_path)` | Clear all trash |

**Supports:**
- Scenes
- Codex entries
- Snippets

### 8.5 Google Drive Integration

**Hook**: `use-import-export.ts`, `use-google-drive.ts`

| Feature | Description |
|---------|-------------|
| **Backup to Drive** | Export project and upload to Google Drive |
| **Restore from Drive** | Download and import backup from Drive |
| **List Backups** | List all project backups in Drive |
| **Delete Backup** | Remove backup from Drive |
| **Get Quota** | Check Drive storage usage |

**Authentication:**
- OAuth 2.0 with PKCE
- Token refresh handling
- Scopes: `drive.file`

### 8.6 Data Management UI

**Location**: `frontend/features/data-management/`

| Component | File | Description |
|-----------|------|-------------|
| **DataManagementMenu** | `data-management-menu.tsx` | Unified entry point for backup/export/restore |
| **ExportProjectButton** | `export-project-button.tsx` | Trigger JSON backup export flow |
| **RestoreProjectDialog** | `RestoreProjectDialog.tsx` | Restore a project from local backup JSON |

---

## 9. Settings & Configuration

### 9.1 Settings Components

| Component | File | Description |
|-----------|------|-------------|
| **SettingsDialog** | `SettingsDialog.tsx` (22KB) | Main settings modal |
| **AIConnectionsTab** | `ai-connections-tab.tsx` | Manage AI providers |
| **NewConnectionDialog** | `new-connection-dialog.tsx` (11KB) | Add new AI connection |
| **GoogleDriveConnection** | `GoogleDriveConnection.tsx` | Google Drive settings |

### 9.2 Settings Features

- **Theme**: Light/Dark mode via `next-themes`
- **AI Provider Management**: Add/remove API keys
- **Auto-save Configuration**: Enable/disable, intervals
- **Editor Preferences**: Font size, line spacing
- **Project Defaults**: Default author, language

### 9.3 Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `constants.ts` | `frontend/lib/config/` | App-wide constants |
| `ai-vendors.ts` | `frontend/lib/config/` | AI provider definitions |
| `model-specs.ts` | `frontend/lib/config/` | Model specifications |

---

## 10. Security & API Key Management

### 10.1 Secure Storage

**Backend Module**: `backend/src/commands/security.rs`

**Technology**: OS Keychain
- macOS: Keychain
- Windows: Credential Manager
- Linux: Secret Service

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Store Key** | `store_api_key(provider, key)` | Encrypt and store API key |
| **Get Key** | `get_api_key(provider)` | Retrieve API key |
| **Delete Key** | `delete_api_key(provider)` | Remove API key |
| **List Providers** | `list_api_key_providers` | Get providers with stored keys |

**Service Name**: `com.becomeauthoror.app`
**Account Format**: `api-key-{provider}`

### 10.2 Validation

- Provider name cannot be empty
- API key cannot be empty
- Format validation per provider (e.g., `sk-or-` for OpenRouter)

---

## 11. Collaboration Features

### 11.1 Real-Time Collaboration

**Technology**: Yjs + WebRTC + IndexedDB

| Feature | Backend Command | Description |
|---------|-----------------|-------------|
| **Save State** | `save_yjs_state(project_path, scene_id, update)` | Persist Yjs state |
| **Load State** | `load_yjs_state(project_path, scene_id)` | Retrieve Yjs state |
| **Has State** | `has_yjs_state(project_path, scene_id)` | Check if state exists |
| **Delete State** | `delete_yjs_state(project_path, scene_id)` | Remove Yjs state |

### 11.2 Collaboration Hook

**Hook**: `use-collaboration.ts`

| Feature | Description |
|---------|-------------|
| **P2P Sync** | WebRTC via public signaling servers |
| **Local Persistence** | IndexedDB for offline support |
| **User Awareness** | Cursor colors and names |
| **Auto-save** | 30-second intervals to Tauri backend |
| **Connection Status** | disconnected, connecting, syncing, synced |

### 11.3 Multi-Tab Coordination

**Service**: `tab-coordinator.ts`

| Feature | Description |
|---------|-------------|
| **Tab Leadership** | Elect leader tab for writes |
| **Conflict Prevention** | Prevent concurrent edits |
| **Warning Display** | Multi-tab warning component |

---

## 12. UI Components Library

### 12.1 Radix UI Components

All located in `frontend/components/ui/`:

| Component | Description |
|-----------|-------------|
| **AlertDialog** | Confirmation dialogs |
| **Alert** | Alert messages |
| **Badge** | Labels and tags |
| **Button** | Styled buttons |
| **Card** | Content cards |
| **Checkbox** | Checkboxes |
| **Collapsible** | Expandable sections |
| **Command** | Command palette (cmdk) |
| **Dialog** | Modal dialogs |
| **DropdownMenu** | Dropdown menus |
| **Input** | Text inputs |
| **Label** | Form labels |
| **Popover** | Popovers |
| **Progress** | Progress bars |
| **RadioGroup** | Radio buttons |
| **Resizable** | Resizable panels |
| **ScrollArea** | Custom scrollbars |
| **Select** | Dropdown selects |
| **Separator** | Dividers |
| **Sheet** | Slide-out panels |
| **Sidebar** | Navigation sidebar (22KB) |
| **Skeleton** | Loading placeholders |
| **Slider** | Range sliders |
| **Switch** | Toggle switches |
| **Tabs** | Tab navigation |
| **TagInput** | Tag input field |
| **Textarea** | Multi-line text |
| **Tooltip** | Tooltips |

### 12.2 Custom Components

| Component | File | Description |
|-----------|------|-------------|
| **ErrorBoundary** | `error-boundary.tsx` | Error catching wrapper |
| **MultiTabWarning** | `multi-tab-warning.tsx` | Concurrent tab warning |
| **AppCleanup** | `app-cleanup.tsx` | Cleanup on unmount |
| **MigrationWrapper** | `migration-wrapper.tsx` | Migration context |
| **ThemeProvider** | `theme-provider.tsx` | Theme context |
| **ToastProvider** | `toast-provider.tsx` | Toast notifications |

---

## 13. Developer Tools & Quality

### 13.1 Testing

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing framework |
| **happy-dom** | DOM simulation |
| **Testing Library** | React component testing |
| **msw** | API mocking |

**Test Files**: 39 test files in `frontend/hooks/`

### 13.2 Code Quality

| Tool | Command | Purpose |
|------|---------|---------|
| **ESLint** | `pnpm run lint` | Linting |
| **Dependency Cruiser** | `pnpm run deps:check` | Dependency rules |
| **Madge** | `pnpm run deps:circular` | Circular dependency detection |
| **Husky** | Pre-commit hooks | Automated quality checks |
| **lint-staged** | On staged files | Pre-commit formatting |

### 13.3 Logging

**Service**: `frontend/shared/utils/logger.ts`

- Scoped logging with prefixes
- Debug, info, warn, error levels
- Silent noisy library logs (tao, wry)

---

## 14. Technical Architecture

### 14.1 Frontend Architecture

```
frontend/
├── core/              # Core infrastructure
│   ├── api/           # API utilities
│   ├── storage/       # Safe storage wrappers
│   ├── tauri/         # Tauri type wrappers
│   └── tab-coordinator.ts  # Multi-tab sync
├── domain/            # Clean Architecture - Domain Layer
│   ├── entities/      # Zod schemas, TypeScript types
│   ├── repositories/  # 18 Repository Interfaces
│   └── services/      # Domain services
├── infrastructure/    # Implementation Layer
│   ├── repositories/  # 18 Tauri Implementations
│   ├── services/      # Concrete services
│   ├── hooks/         # Infrastructure hooks
│   └── di/            # AppContext DI container
├── features/          # Feature-Sliced Design (18 features)
├── hooks/             # 29+ Custom React Hooks
├── lib/               # Shared libraries
│   ├── config/        # Configuration
│   └── tiptap-extensions/  # Editor extensions
├── components/        # Shared UI components (28+)
├── store/             # Zustand stores (3)
└── shared/            # Shared utilities
```

### 14.2 Backend Architecture

```
backend/src/
├── commands/          # Tauri Commands (19 modules)
│   ├── project.rs     # Project CRUD
│   ├── scene.rs       # Scene I/O
│   ├── codex.rs       # World-building
│   ├── chat.rs        # AI chat
│   ├── snippet.rs     # Snippets
│   ├── analysis.rs    # Story analysis
│   ├── backup.rs      # Backup/export
│   ├── search.rs      # Full-text search
│   ├── trash.rs       # Soft delete
│   ├── series.rs      # Series management
│   ├── seed.rs        # Template seeding
│   ├── security.rs    # API key storage
│   ├── mention.rs     # Mention tracking
│   ├── collaboration.rs  # Yjs state
│   └── mod.rs         # Module exports
├── models/            # Data structures (7 modules)
│   ├── project.rs     # ProjectMeta, StructureNode, Series
│   ├── scene.rs       # Scene, SceneMeta
│   ├── codex.rs       # Codex types (7 structs)
│   ├── chat.rs        # ChatThread, ChatMessage
│   ├── snippet.rs     # Snippet
│   ├── analysis.rs    # Analysis
│   └── mod.rs
├── utils/             # Utilities (6 modules)
│   ├── timestamp.rs   # RFC3339 ↔ i64 conversion for IPC
│   ├── validation.rs  # Input validation, path sanitization
│   ├── paths.rs       # Project/app directory helpers
│   ├── text.rs        # Word counting utilities
│   ├── io.rs          # File I/O helpers
│   └── mod.rs
├── lib.rs             # App entry point, command registry
└── main.rs            # Main entry
```

### 14.3 Data Storage

**Project Directory Structure:**
```
MyNovel/
├── .meta/
│   ├── project.json         # Project metadata
│   ├── structure.json       # Hierarchical outline
│   ├── settings.json        # Project settings
│   ├── codex_templates.json # Entry templates
│   ├── codex_relation_types.json  # Relationship types
│   ├── codex_relations.json # Entry relationships
│   ├── codex_tags.json      # Tags
│   ├── scene_codex_links.json  # Scene-entry links
│   ├── trash/               # Soft-deleted items
│   └── chat/
│       ├── threads.json
│       └── messages/{thread-id}.json
├── manuscript/
│   └── {scene-uuid}.md      # YAML frontmatter + content
├── codex/
│   ├── characters/{id}.json
│   ├── locations/{id}.json
│   ├── items/{id}.json
│   ├── lore/{id}.json
│   └── subplots/{id}.json
├── snippets/{id}.json
├── analyses/{id}.json
├── exports/
├── backups/
└── .yjs/                    # Collaboration state
```

### 14.4 Repository Pattern

**Interfaces** (18 total):
- `IProjectRepository`
- `INodeRepository`
- `ICodexRepository`
- `ICodexRelationRepository`
- `ICodexRelationTypeRepository`
- `ICodexTagRepository`
- `ICodexTemplateRepository`
- `IChatRepository`
- `IAnalysisRepository`
- `ISnippetRepository`
- `ISeriesRepository`
- `ISceneCodexLinkRepository`
- `ICollaborationRepository`
- `IMentionRepository`
- `IIdeaRepository`
- `ISceneNoteRepository`
- `IMapRepository`
- `IWorldTimelineRepository`

---

## Feature Count Summary

| Category | Count |
|----------|-------|
| Backend Commands | **112** |
| Frontend Features | **18** |
| Custom Hooks | **29+** |
| Repository Interfaces | **18** |
| UI Components | **28** |
| AI Providers | **12+** |
| Codex Categories | **5** |
| Analysis Types | **6** |
| Export Formats | **4+** (TXT, DOCX, EPUB, JSON backup) |

---

## Appendix: Command Reference

### Backend Commands (112 total)

Authoritative source:
- `backend/src/lib.rs` (`tauri::generate_handler!` list)

Major command groups:
- Project + Structure
- Scene
- Codex + Codex enhancements (tags/templates/relations/links)
- Snippets
- Chat
- Analysis
- Backup/Export/Import + Custom Presets
- Search
- Trash
- Series + Series Codex + Migration
- Security
- Mentions
- Collaboration (Yjs state persistence)
- Ideas
- Scene Notes
- Maps
- World Timeline
- App metadata

---

*This audit was generated by analyzing every file in the codebase including all Rust backend commands, TypeScript frontend features, hooks, components, and configuration files.*
