# Become An Author — Architecture Document

> **Last Updated:** February 19, 2026
> **Codebase Stats:** 313 frontend source files (42,500+ lines) · 41 backend source files (6,200+ lines) · 8 app route files
> **Architecture:** Two-tier Tauri 2.0 desktop application (Rust backend ↔ Next.js frontend)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Project Structure](#2-project-structure)
3. [Technology Stack](#3-technology-stack)
4. [Domain Model](#4-domain-model)
5. [Backend Architecture (Rust/Tauri)](#5-backend-architecture-rusttauri)
6. [Frontend Architecture (Next.js/React)](#6-frontend-architecture-nextjsreact)
7. [AI Subsystem](#7-ai-subsystem)
8. [State Management](#8-state-management)
9. [Infrastructure Layer](#9-infrastructure-layer)
10. [Feature Modules](#10-feature-modules)
11. [Data Flow & IPC](#11-data-flow--ipc)
12. [Storage Architecture](#12-storage-architecture)
13. [Security Architecture](#13-security-architecture)
14. [Export & Backup System](#14-export--backup-system)
15. [Collaboration Architecture](#15-collaboration-architecture)
16. [UI Component Library](#16-ui-component-library)
17. [Configuration & Constants](#17-configuration--constants)
18. [Error Handling & Resilience](#18-error-handling--resilience)
19. [Appendix: Complete File Inventory](#19-appendix-complete-file-inventory)

---

## 1. System Overview

**Become An Author** is a desktop novel-writing application built with Tauri 2.0. It provides a structured manuscript editing environment with AI-powered writing assistance, a world-building codex, real-time P2P collaboration, and multi-format export.

```
┌──────────────────────────────────────────────────────┐
│                    Tauri Shell                        │
│  ┌────────────────────┐  ┌────────────────────────┐  │
│  │  Frontend (WebView) │  │  Backend (Rust sidecar)│  │
│  │  Next.js 15 + React │◄─►│  Tauri 2.0 commands   │  │
│  │  TipTap Editor      │IPC│  File-system storage  │  │
│  │  Vercel AI SDK      │   │  serde_json models    │  │
│  │  Zustand stores     │   │  YAML frontmatter     │  │
│  └────────────────────┘  └────────────────────────┘  │
│                                                      │
│  External APIs: OpenAI, Anthropic, Google, Mistral,  │
│  DeepSeek, Groq, Cohere, xAI, Azure, TogetherAI,    │
│  Fireworks, Perplexity, OpenRouter, Kimi,            │
│  Google Drive (OAuth 2.0)                            │
└──────────────────────────────────────────────────────┘
```

### Key Design Principles

| Principle | Implementation |
|---|---|
| **Offline-first** | All data on local filesystem; AI keys stored per-machine |
| **Clean Architecture** | Domain → Application → Infrastructure → Presentation layers |
| **Dependency Injection** | React Context-based DI via `AppContext.tsx` with lazy singletons |
| **Series-first** | Every project belongs to a series; codex entries are series-scoped |
| **Privacy** | No telemetry; credentials never leave the device |

---

## 2. Project Structure

```
becomeAnAuthor/
├── app/                          # Next.js App Router (8 route files)
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Dashboard (project list)
│   ├── loading.tsx               # Global loading state
│   ├── not-found.tsx             # 404 page
│   ├── globals.css               # Global styles
│   ├── auth/callback/page.tsx    # Google OAuth callback
│   ├── project/
│   │   ├── layout.tsx            # Project workspace layout
│   │   └── page.tsx              # Project workspace (editor/plan/chat)
│   └── series/page.tsx           # Series management
├── frontend/                     # Frontend source (311 files, 42K lines)
│   ├── core/                     # Tauri bridge & low-level utilities
│   ├── domain/                   # Domain entities, repositories, services (interfaces)
│   ├── features/                 # Feature modules (editor, codex, plan, chat, etc.)
│   ├── hooks/                    # Shared React hooks (17 hooks)
│   ├── infrastructure/           # Concrete implementations (DI, repos, services)
│   ├── lib/                      # AI SDK, config, core services
│   ├── shared/                   # Cross-cutting utilities, prompts, types
│   ├── store/                    # Zustand state stores
│   └── components/               # Shared UI component library
├── backend/                      # Rust/Tauri backend (40 files, 5.8K lines)
│   └── src/
│       ├── lib.rs                # Entry point, command registration (188 lines)
│       ├── commands/             # 18 command modules
│       ├── models/               # 11 data models
│       └── utils/                # 7 utility modules
└── docs/                         # Documentation
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Shell** | Tauri 2.0 | Native desktop wrapper, IPC bridge, filesystem access |
| **Backend** | Rust (stable) | File I/O, JSON/YAML serialization, search, export |
| **Frontend Framework** | Next.js 15 (App Router) | SSR routing, page layouts, code splitting |
| **UI Library** | React 19 | Component model, hooks, context |
| **Rich Text Editor** | TipTap (ProseMirror) | Manuscript editing, extensions, @mentions |
| **AI SDK** | Vercel AI SDK 4.x | Multi-provider text generation, streaming, structured output |
| **State Management** | Zustand + persist middleware | Client-side reactive state with localStorage persistence |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Utility-first CSS, accessible component primitives |
| **Collaboration** | Yjs + y-webrtc + y-indexeddb | CRDT-based P2P real-time editing |
| **Document Export** | docx, html2pdf.js | PDF, DOCX generation; ePub via Rust backend |
| **Serialization** | serde, serde_json, serde_yaml | Rust data serialization for all storage formats |
| **Search** | walkdir + regex (Rust) | Full-text project-wide search |
| **Positioning** | tippy.js | Floating menus, popovers for editor UI |

---

## 4. Domain Model

### 4.1 Entity Hierarchy

All entities defined in `frontend/domain/entities/types.ts` (529 lines, 30+ interfaces):

```
Series (1)
 └── Project (N) ←── seriesId, seriesIndex
      ├── DocumentNode (Act | Chapter | Scene)
      │    ├── Act ←── BaseNode { type: "act" }
      │    ├── Chapter ←── BaseNode { type: "chapter", parentId: actId }
      │    └── Scene ←── BaseNode { type: "scene", parentId: chapterId }
      │         ├── content: TiptapContent (JSON)
      │         ├── beats: Beat[]
      │         ├── pov, subtitle, labels, status, wordCount
      │         └── summary: string
      ├── ChatThread ──► ChatMessage[] (role, model, prompt, context)
      ├── Snippet (title, content: TiptapContent, pinned)
      ├── Idea (content, category, tags, archived)
      ├── SceneNote (sceneId, content: TiptapContent)
      ├── ProjectMap (imagePath, markers: MapMarker[], zoom/pan)
      └── WorldEvent (temporal, era, category, importance, linkedCodexIds)

Series (shared)
 └── CodexEntry (N) ←── seriesId
      ├── category: character | location | item | lore | subplot
      ├── name, aliases[], description, coreDescription
      ├── attributes: Record<string, string>
      ├── aiContext: always | detected | exclude | never
      ├── templateId, customFields, gallery[], completeness
      └── settings: { showInMentions, fields[], isGlobal, doNotTrack }

CodexRelation (parentId ↔ childId, typeId, label, strength)
CodexTag, CodexEntryTag, CodexTemplate, CodexRelationType
SceneCodexLink (sceneId ↔ codexId, role, autoDetected)
```

### 4.2 Type Guards

```typescript
isAct(node)    → node is Act      // node.type === "act"
isChapter(node) → node is Chapter  // node.type === "chapter"
isScene(node)  → node is Scene    // node.type === "scene"
```

### 4.3 Supporting Types

| Type | Fields | Purpose |
|---|---|---|
| `ExportedProject` | project, nodes, codex, chats, messages, relations, sections, snippets | Full project export bundle |
| `GoogleTokens` | accessToken, refreshToken, expiresAt, scope | OAuth 2.0 credentials |
| `GoogleUser` | id, email, name, picture | Authenticated user profile |
| `DriveFile` | id, name, mimeType, createdTime, size | Google Drive file metadata |
| `DriveBackupMetadata` | version, exportedAt, appVersion, backupType, projectData | Cloud backup envelope |
| `CollaborationRoom` | sceneId, projectId, lastSyncedAt | P2P collaboration session |
| `YjsStateSnapshot` | stateVector, update (Uint8Array) | CRDT persistence |
| `CollaborationPeer` | id, name, color, cursor | Connected peer state |
| `WorldEventTemporal` | precision, year, month, day, hour, minute | Temporal data with precision |

---

## 5. Backend Architecture (Rust/Tauri)

### 5.1 Entry Point — `lib.rs` (188 lines)

Registers **100+ Tauri commands** across all domains. Uses `tauri::generate_handler![]` macro. Includes plugins: `tauri-plugin-log`, `tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-notification`, `tauri-plugin-shell`, `tauri-plugin-process`, `tauri-plugin-updater`.

### 5.2 Command Modules — `commands/mod.rs`

**18 command modules**, all re-exported via `pub use`:

| Module | File | Lines | Commands | Description |
|---|---|---|---|---|
| `project` | `project.rs` | ~480 | `list_projects`, `create_project`, `delete_project`, `update_project`, `archive_project`, `get_structure`, `save_structure`, `create_node`, `rename_node`, `delete_node`, `open_project`, `get_projects_path`, `list_recent_projects`, `add_to_recent`, `remove_from_recent` | Project CRUD, structure tree management |
| `scene` | `scene.rs` | 320 | `load_scene`, `save_scene`, `update_scene_metadata`, `save_scene_by_id`, `delete_scene` | Scene content I/O with YAML frontmatter |
| `codex` | `codex.rs` | 295 | 21 commands for entries, relations, tags, entry-tags, templates, relation-types, scene-codex-links | Full codex domain CRUD |
| `chat` | `chat.rs` | 180 | `list_chat_threads`, `get_chat_thread`, `create_chat_thread`, `update_chat_thread`, `delete_chat_thread`, `get_chat_messages`, `create_chat_message`, `update_chat_message`, `delete_chat_message` | Thread & message persistence |
| `snippet` | `snippet.rs` | ~80 | `list_snippets`, `save_snippet`, `delete_snippet` | Writing snippet CRUD |
| `backup` | `backup.rs` | ~400 | `export_manuscript_text`, `export_manuscript_docx`, `export_manuscript_epub`, `export_series_backup`, `export_series_as_json`, `export_project_backup`, `export_project_as_json`, `write_export_file`, `import_series_backup`, `import_project_backup`, `save_emergency_backup`, `get_emergency_backup`, `delete_emergency_backup`, `cleanup_emergency_backups` | Multi-format export & import |
| `search` | `search.rs` | ~100 | `search_project` | Full-text search using walkdir + regex |
| `trash` | `trash.rs` | ~120 | `move_to_trash`, `restore_from_trash`, `list_trash`, `permanent_delete`, `empty_trash` | Soft-delete with restore |
| `series` | `series.rs` | ~300 | `list_series`, `create_series`, `update_series`, `delete_series`, `delete_series_cascade`, `list_deleted_series`, `restore_deleted_series`, `permanently_delete_deleted_series`, series-codex commands, `migrate_codex_to_series` | Series lifecycle + codex migration |
| `security` | `security.rs` | ~60 | `store_api_key`, `get_api_key`, `delete_api_key`, `list_api_key_providers` | Secure credential storage |
| `mention` | `mention.rs` | ~80 | `find_mentions`, `count_mentions` | @mention scanning across scenes |
| `collaboration` | `collaboration.rs` | ~60 | `save_yjs_state`, `load_yjs_state`, `has_yjs_state`, `delete_yjs_state` | Yjs CRDT state persistence |
| `idea` | `idea.rs` | ~100 | `list_ideas`, `create_idea`, `update_idea`, `delete_idea` | Quick-capture idea CRUD |
| `scene_note` | `scene_note.rs` | ~60 | `get_scene_note`, `save_scene_note`, `delete_scene_note` | Per-scene note CRUD |
| `world_map` | `world_map.rs` | ~120 | `list_maps`, `save_map`, `delete_map`, `upload_map_image` | Map image + marker storage |
| `world_timeline` | `world_timeline.rs` | ~80 | `list_world_events`, `save_world_event`, `delete_world_event` | World event timeline |
| `preset` | `preset.rs` | ~60 | `list_custom_presets`, `save_custom_preset`, `delete_custom_preset` | Custom export presets |
| `google_oauth` | `google_oauth.rs` | 428 | `google_oauth_connect`, `get_access_token`, `get_user`, `sign_out` | Desktop OAuth 2.0 via loopback + keyring |

### 5.3 Models — `models/mod.rs`

**11 model files** defining serde-serializable Rust structs:

| Model | Key Structs |
|---|---|
| `project.rs` | `ProjectMeta`, `ProjectConfig`, `StructureNode`, `RecentProject` |
| `scene.rs` | `Scene`, `SceneMeta`, `YamlSceneMeta` |
| `codex.rs` | `CodexEntry`, `CodexRelation`, `CodexTag`, `CodexEntryTag`, `CodexTemplate`, `CodexRelationType`, `SceneCodexLink` |
| `chat.rs` | `ChatThread`, `ChatMessage`, `ChatContext` |
| `snippet.rs` | `Snippet` |
| `backup.rs` | `EmergencyBackup`, `ExportManifest`, `SeriesBackup`, `ImportResult` |
| `trash.rs` | `TrashedItem`, `TrashedProject` |
| `series.rs` | `SeriesMeta` |
| `idea.rs` | `Idea` |
| `scene_note.rs` | `SceneNote` |
| `world.rs` | `ProjectMap`, `MapMarker`, `WorldEvent`, `WorldEventTemporal` |

### 5.4 Utilities — `utils/mod.rs`

**7 utility modules**:

| Utility | Purpose |
|---|---|
| `atomic_write` | Temp-file-then-rename write to prevent data corruption |
| `timestamp` | UTC timestamp generation (`chrono`) |
| `count_words` | Word counting for scene statistics |
| `project_dir` | Platform-aware project directory resolution |
| `validate_file_size` | Enforces `MAX_SCENE_SIZE` (10MB) |
| `validate_json_size` | JSON content size validation |
| `validate_no_null_bytes` | Input sanitization against null byte injection |

### 5.5 Scene Storage Format

Scenes use **YAML frontmatter + TipTap JSON body**:

```yaml
---
id: scene-uuid
title: "Chapter 1 Scene"
order: 1.0
parent_id: chapter-uuid
status: draft
pov: "Alice"
word_count: 1234
created_at: "2026-01-15T10:30:00Z"
updated_at: "2026-02-16T20:00:00Z"
---
{"type":"doc","content":[{"type":"paragraph","content":[...]}]}
```

The `parse_scene_document()` function (68 lines) splits frontmatter from content, and `build_frontmatter()` reconstructs it.

---

## 6. Frontend Architecture (Next.js/React)

### 6.1 Layer Architecture

```
┌─────────────────────────────────────────────┐
│  Layer 1: App Routes (app/)                 │  Next.js pages & layouts
├─────────────────────────────────────────────┤
│  Layer 2: Features (features/)              │  Feature-specific components & hooks
├─────────────────────────────────────────────┤
│  Layer 3: Shared Hooks (hooks/)             │  Cross-feature React hooks
├─────────────────────────────────────────────┤
│  Layer 4: Store (store/)                    │  Zustand global state
├─────────────────────────────────────────────┤
│  Layer 5: Infrastructure (infrastructure/)  │  DI, repositories, services
├─────────────────────────────────────────────┤
│  Layer 6: Domain (domain/)                  │  Entities, repository interfaces
├─────────────────────────────────────────────┤
│  Layer 7: Core (core/, lib/)                │  Tauri bridge, AI SDK, config
├─────────────────────────────────────────────┤
│  Layer 8: Shared (shared/)                  │  Utils, prompts, types
└─────────────────────────────────────────────┘
```

**Dependency rule:** Each layer may only depend on layers below it.

### 6.2 Domain Layer — `frontend/domain/`

**Interfaces only** — no implementations. Enables dependency injection and testing.

| Directory | Files | Purpose |
|---|---|---|
| `entities/types.ts` | 1 (529 lines) | All entity interfaces (30+) |
| `repositories/` | 12 interfaces | `INodeRepository`, `IProjectRepository`, `ICodexRepository`, `IChatRepository`, `ISnippetRepository`, `ICodexRelationRepository`, `ISceneCodexLinkRepository`, `ISeriesRepository`, `IIdeaRepository`, `ISceneNoteRepository`, `IMapRepository`, `IWorldTimelineRepository` |
| `services/` | 2 interfaces | `IChatService`, `IExportService` |
| `types/` | 1 file | `export-types.ts` — export configuration types |

### 6.3 Core Layer — `frontend/core/`

| File | Lines | Purpose |
|---|---|---|
| `core/tauri/commands.ts` | ~400 | Type-safe `invoke()` wrappers for all 100+ Tauri commands |
| `core/tauri/index.ts` | ~30 | Barrel exports |
| `core/storage/safe-storage.ts` | ~80 | Typed localStorage abstraction with JSON parse/stringify |
| `lib/core/save-coordinator.ts` | 175 | Singleton preventing race conditions — per-scene mutex, debounce, retry |
| `lib/core/editor-state-manager.ts` | 236 | VS Code-style dirty tracking, debounced saves, emergency backups, status notifications |

---

## 7. AI Subsystem

### 7.1 Architecture

```
                     ┌─────────────────────┐
                     │  Feature Components  │
                     │  (Chat, Editor, Spark)│
                     └──────────┬──────────┘
                                │ generate() / stream() / object()
                     ┌──────────▼──────────┐
                     │   lib/ai/client.ts   │  204 lines
                     │   (Unified AI Client) │
                     │   - getConnection()   │
                     │   - assertMessages()  │
                     └──────────┬──────────┘
                                │ getModel()
                     ┌──────────▼──────────┐
                     │  lib/ai/providers.ts │  57 lines
                     │  (14 Provider Factory)│
                     └──────────┬──────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
   @ai-sdk/     @ai-sdk/   @ai-sdk/   @ai-sdk/   @openrouter/
    openai      anthropic    google     mistral    ai-sdk-provider
                                        (+ 9 more)
```

### 7.2 Files

| File | Lines | Exports | Purpose |
|---|---|---|---|
| `lib/ai/index.ts` | 29 | Barrel | Re-exports all client + provider functions |
| `lib/ai/client.ts` | 204 | `generate()`, `stream()`, `object()`, `getEnabledConnections()`, `getConnectionForModel()`, `fetchModelsForConnection()` | Unified AI client wrapping Vercel AI SDK |
| `lib/ai/providers.ts` | 57 | `getModel()` | Factory creating provider-specific model instances for 14 vendors |

### 7.3 Supported Providers (14)

OpenAI, Anthropic, Google Gemini, Mistral, DeepSeek, Groq, Cohere, xAI (Grok), Azure OpenAI, TogetherAI, Fireworks, Perplexity, OpenRouter, Kimi (Moonshot).

### 7.4 AI Usage Patterns

| Pattern | Function | Consumers |
|---|---|---|
| **One-shot generation** | `generate()` | Spark prompts, analysis, text replacement |
| **Streaming** | `stream()` | Chat responses, continue-writing |
| **Structured output** | `object()` (Zod schema) | Spark prompt categorization, analysis |
| **Connection lookup** | `getConnection()` | All — finds enabled connection for model |
| **Model discovery** | `ModelDiscoveryService` | Settings — fetches available models per provider |

### 7.5 Context Assembly

1. **ContextEngine** (`shared/utils/context-engine.ts`, 324 lines) — Gathers context from structure nodes, scene content, codex entries, and snippets.
2. **ContextPacker** (`shared/utils/context-packer.ts`, 275 lines) — Token-budget-aware packing. Calculates budget from model specs, truncates blocks to fit within `MIN_CONTEXT_BUDGET_TOKENS` (1500) to `MAX_CONTEXT_BUDGET_CAP_TOKENS` (16000).
3. **Prompt Templates** (`shared/prompts/templates.ts`, 128 lines) — 8 predefined chat system prompts (e.g., Story Architect, Character Coach, World Builder).

---

## 8. State Management

### 8.1 Zustand Stores

| Store | File | Lines | Persisted | State |
|---|---|---|---|---|
| `useProjectStore` | `store/use-project-store.ts` | 99 | ✅ (partial) | `viewMode` (plan/write/chat), `activeSceneId`, `activeProjectId`, `showSidebar`, `showTimeline`, `rightPanelTab`, `leftSidebarTab` |
| `useChatStore` | `store/use-chat-store.ts` | 23 | ❌ | `activeThreadId`, `threadView` (active/archived/deleted) |
| `useFormatStore` | `store/use-format-store.ts` | 73 | ✅ (full) | Typography settings (fontFamily, fontSize, lineHeight, alignment, pageWidth), typewriterMode, focusMode, showWordCount |

### 8.2 Server State — `useLiveQuery`

Custom hook (`hooks/use-live-query.ts`) providing a React Query-like pattern for Tauri data:
- **Caching** with configurable stale time
- **Invalidation** via `invalidateQueries(patterns)`  
- **Background refetch** on window focus
- **Optimistic updates** support

---

## 9. Infrastructure Layer

### 9.1 Dependency Injection — `infrastructure/di/AppContext.tsx` (214 lines)

**Singleton lazy-proxy pattern**: Creates repository instances only on first property access using `Proxy.get()`.

```typescript
interface AppServices {
  nodeRepository: INodeRepository;          // TauriNodeRepository
  projectRepository: IProjectRepository;    // TauriProjectRepository
  codexRepository: ICodexRepository;        // TauriCodexRepository
  chatRepository: IChatRepository;          // TauriChatRepository
  snippetRepository: ISnippetRepository;    // TauriSnippetRepository
  codexRelationRepository: ICodexRelationRepository;
  sceneCodexLinkRepository: ISceneCodexLinkRepository;
  seriesRepository: ISeriesRepository;
  ideaRepository: IIdeaRepository;
  sceneNoteRepository: ISceneNoteRepository;
  mapRepository: IMapRepository;
  worldTimelineRepository: IWorldTimelineRepository;
  chatService: IChatService;                // ChatService
  exportService: IExportService;            // DocumentExportService
}
```

Test injection via `<AppProvider services={{ nodeRepository: mockRepo }}>`.

### 9.2 Repositories (10 Tauri implementations)

Each wraps `invoke()` calls to Tauri backend commands:

| Repository | Lines | Key Operations |
|---|---|---|
| `TauriNodeRepository` | ~200 | `getByProject()`, `create()`, `update()`, `delete()`, `getStructure()`, `saveStructure()` — singleton with `setProjectPath()` |
| `TauriProjectRepository` | 188 | `get()`, `getAll()`, `create()`, `update()`, `archive()`, `delete()`, `listTrash()`, `restoreFromTrash()`, `getBySeries()` |
| `TauriCodexRepository` | ~150 | `getBySeries()`, `save()`, `delete()` — reads from per-category folders |
| `TauriChatRepository` | ~100 | Thread/message CRUD, `getMessagesByThread()` |
| `TauriSnippetRepository` | ~80 | Snippet CRUD with project-scoped storage |
| `TauriCodexRelationRepository` | ~80 | Relation CRUD |
| `TauriSceneCodexLinkRepository` | ~80 | Scene↔Codex link CRUD |
| `TauriSeriesRepository` | ~120 | Series lifecycle + series-scoped codex |
| `TauriIdeaRepository` | ~80 | Idea CRUD |
| `TauriSceneNoteRepository` | ~60 | Per-scene note storage |
| `TauriMapRepository` | ~80 | Map CRUD + image upload |
| `TauriWorldTimelineRepository` | ~60 | World event CRUD |

### 9.3 Services

| Service | File | Lines | Purpose |
|---|---|---|---|
| `ChatService` | `ChatService.ts` | 124 | Orchestrates AI generation: builds context from scenes+codex, assembles conversation history (last 10 messages), calls `generate()` |
| `DocumentExportService` | `DocumentExportService.ts` | 590 | Multi-format export engine: PDF (html2pdf.js), DOCX (docx lib), Markdown, ePub (Rust backend). Includes preset system, template variables, live preview |
| `ModelDiscoveryService` | `ModelDiscoveryService.ts` | 340 | Singleton with cache. Fetches models from provider APIs with provider-specific parsers (OpenAI, Anthropic, Google, OpenRouter formats). Falls back to curated defaults |
| `EmergencyBackupService` | `emergency-backup-service.ts` | 123 | Emergency backups via Tauri filesystem. Stores in `{project}/.meta/emergency_backups/`. 24-hour expiry |
| `GoogleAuthService` | `google-auth-service.ts` | 301 | OAuth 2.0 service. **Desktop:** Uses backend `google_oauth` commands (loopback). **Web:** Standard PKCE flow. |
| `GoogleDriveService` | `google-drive-service.ts` | 286 | Drive API: app folder management, backup upload/download/delete, storage quota |

---

## 10. Feature Modules

### 10.1 Editor Feature — `features/editor/`

The primary writing environment. 15+ components:

| Component | File | Lines | Purpose |
|---|---|---|---|
| `SceneEditor` | `scene-editor.tsx` | ~500 | Main editor orchestrator — TipTap initialization, extension loading, toolbar, save coordination |
| `EditorToolbar` | `editor-toolbar.tsx` | ~250 | Formatting toolbar with text style, alignment, lists, undo/redo |
| `TextSelectionMenu` | `text-selection-menu.tsx` | 208 | Floating tippy.js menu on text selection with 4 AI actions: Tweak, Expand, Rephrase, Shorten |
| `TextReplaceDialog` | `text-replace-dialog.tsx` | ~300 | AI-powered text replacement dialog with streaming preview, accept/reject |
| `ContinueWritingMenu` | `continue-writing-menu.tsx` | 332 | Dialog for AI text continuation with mode selection (continue/rewrite/summarize), model picker |
| `SparkPopover` | `spark-popover.tsx` | 446 | AI prompt generator — generates context-aware writing prompts via `generateObject()` with Zod schema + JSON fallback |
| `FormatBar` | `format-bar.tsx` | ~200 | Typography settings panel (font, size, line height, alignment, page width) |
| `SceneBeats` | `scene-beats.tsx` | ~150 | Beat tracking checklist for scene planning |
| `MentionSuggestion` | `mention-suggestion.tsx` | ~200 | @mention autocomplete for codex entries in editor |

**Editor Extensions** (`features/editor/extensions/`): `MentionExtension` (codex linking), `TypewriterExtension` (cursor centering at configurable offset), `FocusModeExtension` (dims non-focused paragraphs).

### 10.2 Codex Feature — `features/codex/`

| Component | Lines | Purpose |
|---|---|---|
| `CodexList` | 311 | Virtualized scrolling list with category filtering, template selection, search |
| `EntityEditor` | 217 | Sub-component architecture — template fields, image upload, delete/save |
| `CodexRelationGraph` | ~400 | Force-directed relationship visualization |
| `MentionTracker` | ~150 | Tracks @mentions of codex entries across manuscript |

### 10.3 Plan Feature — `features/plan/`

5 views orchestrated by `PlanView` (400 lines):

| View | File | Lines | Purpose |
|---|---|---|---|
| `GridView` | `grid-view.tsx` | 231 | Collapsible Acts/Chapters/Scenes hierarchy |
| `OutlineView` | `outline-view.tsx` | 265 | Tree hierarchy with drag-and-drop reordering |
| `TimelineView` | `timeline-view.tsx` | 162 | Codex-scene matrix showing character/location appearances |
| `WorldTimelineView` | `world-timeline-view.tsx` | 503 | Era-grouped world events with temporal precision fields |
| `MapView` | `map-view.tsx` | 579 | Image upload, pan/zoom, marker placement with codex linking |

### 10.4 Chat Feature — `features/chat/`

| Component | Lines | Purpose |
|---|---|---|
| `ChatInterface` | 395 | Thread sidebar, message list, input, model/prompt selection |
| `ChatMessage` | ~150 | Markdown rendering, copy, regenerate |
| `ContextSelector` | ~200 | Select scenes, codex entries, snippets as context |

### 10.5 Navigation — `ProjectNavigation` (489 lines)

Left sidebar tree: manuscript structure (acts/chapters/scenes), codex tabs, snippet list. Drag-and-drop reordering.

### 10.6 Settings — `features/settings/`

| Component | Lines | Purpose |
|---|---|---|
| `SettingsDialog` | 131 | 4-tab dialog orchestrator with theme toggle |
| `AIConnectionsTab` | 171 | AI vendor connection CRUD with model refresh |
| `useAIConnections` | 158 | Hook: CRUD, localStorage persistence, model discovery |

### 10.7 Dashboard — `features/dashboard/`

| Component | Lines | Purpose |
|---|---|---|
| `ProjectGrid` | 38 | Responsive CSS grid for project cards |
| `ProjectCard` | 127 | Cover image, metadata, dropdown menu |

### 10.8 Other Features

| Feature | Key Components | Purpose |
|---|---|---|
| `ai/` | `ModelSelector`, `PromptSelector` | AI model and prompt dropdowns |
| `collaboration/` | `CollaborationProvider`, `CursorOverlay`, `useCollaboration` | Yjs + WebRTC P2P editing |
| `export/` | `ExportDialog`, `ExportPreview`, `useDocumentExport` | Multi-format export UI |
| `search/` | `SearchDialog` | Full-text search via Tauri backend |
| `updater/` | `UpdateNotifier` | Checks for updates on startup, shows toast notification |

---

## 11. Data Flow and IPC

### 11.1 Tauri IPC Pattern

```
React Component → useAppServices() → TauriRepository → invoke("command") ═══ IPC ═══ #[tauri::command] → File System
                                                                                          ▲
useLiveQuery("key", () => repo.method()) → Cache + Auto-invalidation ──────────────────────┘
```

### 11.2 AI Generation Flow

```
User action → ContextEngine.gather() → ContextPacker.pack() → generate()/stream()/object()
                                                                    │
                                                    getConnection(modelId) → getModel() → Vercel AI SDK → External API
```

### 11.3 Save Flow

```
Editor onChange → EditorStateManager.markDirty() → Debounced save
    → SaveCoordinator.save(sceneId) → acquire mutex → invoke("save_scene_by_id")
    → On failure: EmergencyBackupService.saveBackup() → release mutex
```

---

## 12. Storage Architecture

### 12.1 Disk Layout

```
~/BecomeAnAuthor/
├── Projects/{series}/{project}/
│   ├── project.json, structure.json
│   ├── scenes/{file}.md (YAML frontmatter + TipTap JSON)
│   └── .meta/ (chat/, snippets.json, ideas.json, scene-notes/, maps/,
│         world-timeline.json, codex/{category}/, codex-relations.json,
│         codex-tags.json, emergency_backups/, yjs-states/, custom-presets.json)
├── Series/ (series-list.json, {id}/codex/)
└── .recent.json
```

### 12.2 Client-Side Storage (localStorage)

| Key | Data |
|---|---|
| `ai_connections` | AIConnection[] (vendor, API key, models, enabled) |
| `project-store` | Zustand: sidebar/timeline visibility, tab selections |
| `format-settings` | Zustand: typography and editor mode preferences |
| `google_tokens` | OAuth tokens with expiry |

---

## 13. Security Architecture

- **API Keys**: Tauri keychain (`keyring`) via `security.rs`; Google tokens also stored in keychain on desktop.
- **OAuth 2.0**:
  - **Desktop:** System browser + localhost loopback + PKCE. Tokens in OS keychain.
  - **Web:** Standard PKCE flow. Tokens in localStorage.
- **Updater Signing**: Updates signed with Minisign private key; app verifies with public key.
- **Input Validation**: `validate_no_null_bytes()`, `validate_json_size()`, `validate_file_size()` (10MB max)
- **Atomic Writes**: All backend writes use temp-file-then-rename

---

## 14. Export and Backup System

### 14.1 Export Formats

| Format | Engine | Location |
|---|---|---|
| PDF | html2pdf.js | Frontend (`DocumentExportService`) |
| DOCX | docx library | Frontend |
| Markdown | String assembly | Frontend |
| ePub | Rust command | Backend |
| Plain Text | Rust command | Backend |
| JSON | Rust commands | Backend |

### 14.2 Backup Hierarchy

1. **Auto-save** — debounced, per-scene mutex
2. **Emergency backup** — on save failure, 24-hour expiry
3. **Project backup** — full JSON export
4. **Google Drive** — OAuth cloud backup (15min/1hour/daily)

---

## 15. Collaboration Architecture

### 15.1 P2P Stack

```
CollaborationProvider → Yjs Doc (CRDT) + y-webrtc (P2P Signaling) + y-indexeddb (Local Persistence)
                            │
                            ▼
                   TipTap y-prosemirror binding
```

### 15.2 Components

| Component | Purpose |
|---|---|
| `CollaborationProvider` | React context managing Yjs document lifecycle, WebRTC connection |
| `CursorOverlay` | Renders remote peer cursors with names and colors |
| `useCollaboration` | Hook: connection status, peer list, sync state |

### 15.3 State Persistence

Yjs document state persisted via Tauri commands: `save_yjs_state`, `load_yjs_state`, `has_yjs_state`, `delete_yjs_state`. Stored in `.meta/yjs-states/`.

---

## 16. UI Component Library

**37+ shared components** in `frontend/components/ui/` (shadcn/ui + Radix):

| Category | Components |
|---|---|
| **Layout** | `card`, `dialog`, `sheet`, `tabs`, `scroll-area`, `separator`, `collapsible`, `resizable` |
| **Forms** | `button`, `input`, `textarea`, `select`, `checkbox`, `switch`, `slider`, `label`, `form` |
| **Data** | `table`, `badge`, `avatar`, `progress`, `skeleton` |
| **Feedback** | `alert`, `toast` (sonner), `tooltip`, `popover` |
| **Navigation** | `dropdown-menu`, `context-menu`, `menubar`, `command`, `breadcrumb` |
| **Overlay** | `alert-dialog`, `hover-card` |
| **Custom** | `empty-state`, `decorative-grid`, `loading-spinner` |

---

## 17. Configuration and Constants

| File | Lines | Purpose |
|---|---|---|
| `lib/config/constants.ts` | ~200 | `GOOGLE_CONFIG` (Client ID), `STORAGE_KEYS`, `INFRASTRUCTURE`, `APP_NAME`, limits |
| `lib/config/ai-vendors.ts` | ~300 | 14 provider registry with name, icon, color, default models, endpoints |
| `lib/config/model-specs.ts` | ~150 | Token limits and capabilities per model (context windows) |
| `lib/config/timing.ts` | ~40 | `SAVE_DEBOUNCE`, `SEARCH_DEBOUNCE`, `AUTOSAVE_INTERVAL` |

---

## 18. Error Handling and Resilience

### 18.1 Strategy Layers

| Layer | Mechanism |
|---|---|
| Backend | `Result<T, String>` — errors propagated via IPC |
| Repository | Try-catch around `invoke()`, scoped `logger` |
| Service | Domain error messages, graceful degradation |
| Hook | Error states in `useLiveQuery` |
| UI | Toast notifications via `toast-service.ts` (sonner) |

### 18.2 Data Recovery

1. Scene save failure → `EmergencyBackupService.saveBackup()`
2. Corruption → `parse_scene_document()` falls back to `default_scene_meta()`
3. Project deletion → soft delete to `.trash/` with restore
4. Expired cleanup → `cleanup_emergency_backups` on startup
5. Atomic writes → temp-file-then-rename pattern

### 18.3 Logging

`shared/utils/logger.ts` — scoped logger with `.scope("ModuleName")` for consistent `log.info/warn/error` output.

---

## 19. Appendix: Complete File Inventory

### 19.1 Frontend — `frontend/` (311 source files)

| Directory | Key Files |
|---|---|
| `core/tauri/` | `commands.ts`, `index.ts` |
| `core/storage/` | `safe-storage.ts` |
| `domain/entities/` | `types.ts` (529 lines, 30+ interfaces) |
| `domain/repositories/` | 12 interface files (`I*Repository.ts`) |
| `domain/services/` | `IChatService.ts`, `IExportService.ts` |
| `infrastructure/di/` | `AppContext.tsx` (214 lines) |
| `infrastructure/repositories/` | 12 Tauri implementations |
| `infrastructure/services/` | 6 service implementations |
| `lib/ai/` | `index.ts`, `client.ts`, `providers.ts` |
| `lib/config/` | `constants.ts`, `ai-vendors.ts`, `model-specs.ts`, `timing.ts` |
| `lib/core/` | `save-coordinator.ts`, `editor-state-manager.ts` |
| `store/` | `use-project-store.ts`, `use-chat-store.ts`, `use-format-store.ts` |
| `hooks/` | 31 shared hooks |
| `shared/utils/` | `context-engine.ts`, `context-packer.ts`, `toast-service.ts`, `logger.ts` |
| `shared/prompts/` | `templates.ts` |
| `features/editor/` | ~15 components, 3 hooks, 3 extensions |
| `features/codex/` | ~8 components, 2 hooks |
| `features/plan/` | 5 views + orchestrator |
| `features/chat/` | ~5 components, 1 hook |
| `features/navigation/` | 2 components |
| `features/settings/` | ~10 components, 2 hooks |
| `features/dashboard/` | 2 components |
| `features/ai/` | 2 components |
| `features/collaboration/` | 3 components, 1 hook, 1 provider |
| `features/export/` | 3 components, 1 hook |
| `features/search/` | 1 component |
| `components/ui/` | 37+ shadcn/ui components |

### 19.2 Backend — `backend/src/` (40 source files)

| Directory | Files |
|---|---|
| Root | `lib.rs` (188 lines), `main.rs` |
| `commands/` | `mod.rs` + 18 modules: `project`, `scene`, `codex`, `chat`, `snippet`, `backup`, `search`, `trash`, `series`, `security`, `mention`, `collaboration`, `idea`, `scene_note`, `world_map`, `world_timeline`, `preset` |
| `models/` | `mod.rs` + 11 models: `project`, `scene`, `codex`, `chat`, `snippet`, `backup`, `trash`, `series`, `idea`, `scene_note`, `world` |
| `utils/` | `mod.rs` + 7 utils: `atomic_write`, `timestamp`, `count_words`, `project_dir`, `validate_file_size`, `validate_json_size`, `validate_no_null_bytes` |

### 19.3 App Routes — `app/` (8 files)

| File | Purpose |
|---|---|
| `layout.tsx` | Root layout — ThemeProvider, AppProvider, Toaster |
| `page.tsx` | Dashboard — project list, create, series filter |
| `loading.tsx` | Suspense fallback |
| `not-found.tsx` | 404 page |
| `globals.css` | Global CSS with design tokens |
| `auth/callback/page.tsx` | Google OAuth callback |
| `project/layout.tsx` | Project workspace layout |
| `project/page.tsx` | Project workspace (editor/plan/chat tabs) |
| `series/page.tsx` | Series management |

---

*This architecture document was generated from an exhaustive, file-by-file analysis of every source file in the project.*
