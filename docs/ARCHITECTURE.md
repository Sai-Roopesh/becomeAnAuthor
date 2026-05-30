# Become An Author — Architecture Document

> **Last Updated:** May 29, 2026
> **Codebase Stats:** 322 frontend source files (~46.9K lines) · 34 backend source files (~10.1K lines) · 8 app route files
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
│  │  Next.js 16 + React │◄─►│  Tauri 2.0 commands   │  │
│  │  TipTap Editor      │IPC│  File-system storage  │  │
│  │  Vercel AI SDK      │   │  serde_json models    │  │
│  │  Zustand stores     │   │  SQLite + file storage│  │
│  └────────────────────┘  └────────────────────────┘  │
│                                                      │
│  External APIs: OpenAI, Anthropic, Google, Mistral,  │
│  DeepSeek, Groq, Cohere, xAI, Azure, TogetherAI,    │
│  Fireworks, Perplexity, OpenRouter, Kimi,            │
│  Google Drive (OAuth 2.0)                            │
└──────────────────────────────────────────────────────┘
```

### Key Design Principles

| Principle                | Implementation                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| **Offline-first**        | All data on local filesystem; credentials remain local on device   |
| **Clean Architecture**   | Domain → Application → Infrastructure → Presentation layers        |
| **Dependency Injection** | React Context-based DI via `AppContext.tsx` with lazy singletons   |
| **Series-first**         | Every project belongs to a series; codex entries are series-scoped |
| **Privacy**              | No telemetry; credentials never leave the device                   |

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
│   ├── project/
│   │   ├── layout.tsx            # Project workspace layout
│   │   └── page.tsx              # Project workspace (editor/plan/chat)
│   └── series/page.tsx           # Series management
├── frontend/                     # Frontend source (322 files, ~46.9K lines)
│   ├── core/                     # Tauri bridge & low-level utilities
│   ├── domain/                   # Domain entities, repositories, services (interfaces)
│   ├── features/                 # Feature modules (editor, codex, plan, chat, etc.)
│   ├── hooks/                    # Shared React hooks (22 hooks)
│   ├── infrastructure/           # Concrete implementations (DI, repos, services)
│   ├── lib/                      # AI SDK, config, core services
│   ├── shared/                   # Cross-cutting utilities, prompts, types
│   ├── store/                    # Zustand state stores
│   └── components/               # Shared UI component library
├── backend/                      # Rust/Tauri backend (34 files, ~10.1K lines)
│   └── src/
│       ├── lib.rs                # Entry point, command registration (188 lines)
│       ├── commands/             # 15 command modules
│       ├── models/               # 7 data models
│       └── utils/                # 5 utility modules
└── docs/                         # Documentation
```

---

## 3. Technology Stack

| Layer                  | Technology                           | Purpose                                                            |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| **Shell**              | Tauri 2.0                            | Native desktop wrapper, IPC bridge, filesystem access              |
| **Backend**            | Rust (stable)                        | File I/O, JSON serialization, search, export                       |
| **Frontend Framework** | Next.js 16 (App Router)              | SSR routing, page layouts, code splitting                          |
| **UI Library**         | React 19                             | Component model, hooks, context                                    |
| **Rich Text Editor**   | TipTap (ProseMirror)                 | Manuscript editing, extensions, @mentions                          |
| **AI SDK**             | Vercel AI SDK 6.x (@ai-sdk providers v3) | Multi-provider text generation, streaming, structured output   |
| **State Management**   | Zustand + SQLite app-state hydration | Client-side reactive state synced to backend SQLite preferences    |
| **Styling**            | Tailwind CSS 4 + shadcn/ui           | Utility-first CSS, accessible component primitives                 |
| **Collaboration**      | Yjs + y-webrtc + SQLite snapshots    | CRDT-based P2P real-time editing with backend snapshot persistence |
| **Document Export**    | docx (npm), @react-pdf/renderer      | PDF, DOCX generation (frontend); ePub via Rust backend             |
| **Serialization**      | serde, serde_json                    | Rust data serialization for all storage formats                    |
| **Search**             | walkdir + regex (Rust)               | Full-text project-wide search                                      |
| **Positioning**        | tippy.js                             | Floating menus, popovers for editor UI                             |

---

## 4. Domain Model

### 4.1 Entity Hierarchy

All entities defined in `frontend/domain/entities/types.ts` (432 lines, 40+ interfaces):

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
      └── SceneNote (sceneId, content: TiptapContent)

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

| Type                  | Fields                                                                | Purpose                                         |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| `GoogleTokens`        | accessToken, refreshToken, expiresAt, scope                           | OAuth 2.0 credentials                           |
| `GoogleUser`          | id, email, name, picture                                              | Authenticated user profile                      |
| `DriveFile`           | id, name, mimeType, createdTime, size                                 | Google Drive file metadata                      |
| `BackupPackageInfo`   | kind, appVersion, schemaVersion, createdAt, counts, sourceHints       | Inspected `.baa` package metadata before import |
| `CollaborationRoom`   | sceneId, projectId, lastSyncedAt                                      | P2P collaboration session                       |
| `YjsStateSnapshot`    | stateVector, update (Uint8Array)                                      | CRDT persistence                                |
| `CollaborationPeer`   | id, name, color, cursor                                               | Connected peer state                            |
| `SceneSectionSegment` | key, title, sectionType, paragraphs                                   | Section data for export                         |
| `SceneSectionType`    | standard, chapter, part, appendix                                     | Export section classification                   |

---

## 5. Backend Architecture (Rust/Tauri)

### 5.1 Entry Point — `lib.rs` (186 lines)

Registers **100+ Tauri commands** across all domains. Uses `tauri::generate_handler![]` macro. Includes plugins: `tauri-plugin-log`, `tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-notification`, `tauri-plugin-shell`, `tauri-plugin-process`, `tauri-plugin-updater`.

### 5.2 Command Modules — `commands/mod.rs`

Command modules are re-exported via `pub use` for centralized Tauri registration.

| Module             | File                  | Lines | Commands                                                                                                                                                                                                                                                                     | Description                                                                        |
| ------------------ | --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `project`          | `project.rs`          | ~1155 | `list_projects`, `create_project`, `delete_project`, `update_project`, `archive_project`, `get_structure`, `save_structure`, `create_node`, `rename_node`, `delete_node`, `open_project`, `get_projects_path`, `list_recent_projects`, `add_to_recent`, `remove_from_recent` | Project CRUD, structure tree management                                            |
| `scene`            | `scene.rs`            | 442   | `load_scene`, `save_scene`, `update_scene_metadata`, `save_scene_by_id`, `delete_scene`                                                                                                                                                                                      | Scene content I/O (TipTap JSON `.md` body + SQLite metadata) + path security        |
| `codex`            | `codex.rs`            | 468   | 21 commands for entries, relations, tags, entry-tags, templates, relation-types, scene-codex-links                                                                                                                                                                           | Full codex domain CRUD                                                             |
| `chat`             | `chat.rs`             | ~345  | `list_chat_threads`, `get_chat_thread`, `create_chat_thread`, `update_chat_thread`, `delete_chat_thread`, `get_chat_messages`, `create_chat_message`, `update_chat_message`, `delete_chat_message`, `find_chat_thread_for_message`                                           | Thread/message persistence in SQLite (WAL)                                         |
| `snippet`          | `snippet.rs`          | ~120  | `list_snippets`, `save_snippet`, `delete_snippet`                                                                                                                                                                                                                            | Writing snippet CRUD                                                               |
| `backup`           | `backup.rs`           | ~2815 | `export_full_snapshot`, `export_series_package`, `export_novel_package`, `inspect_backup_package`, `import_backup_package`, `read_file_bytes`, `write_temp_backup_file`, `write_export_file`                                                                                 | SQL-native `.baa` portability engine for full snapshots and scoped clone imports   |
| `backup_emergency` | `backup_emergency.rs` | ~80   | `save_emergency_backup`, `get_emergency_backup`, `delete_emergency_backup`, `cleanup_emergency_backups`                                                                                                                                                                      | Emergency backup lifecycle                                                         |
| `search`           | `search.rs`           | ~330  | `search_project`                                                                                                                                                                                                                                                             | Full-text search backed by SQLite FTS5 index with incremental rebuild by signature |
| project trash      | `project.rs`          | —     | `list_project_trash`, `restore_trashed_project`, `permanently_delete_trashed_project`                                                                                                                                                                                        | Project soft-delete / restore (in `project.rs`; no separate `trash.rs` module)     |
| `series`           | `series.rs`           | ~640  | `list_series`, `create_series`, `update_series`, `delete_series`, `delete_series_cascade`, `list_deleted_series`, `restore_deleted_series`, `permanently_delete_deleted_series`, series-codex commands                                                                       | Series lifecycle + codex management                                                |
| `security`         | `security.rs`         | ~350  | `store_api_key`, `get_api_key`, `has_api_key`, `delete_api_key`, `list_api_key_providers`                                                                                                                                                                                    | Encrypted API-key storage in SQLite                                                |
| `mention`          | `mention.rs`          | ~305  | `find_mentions`, `count_mentions`                                                                                                                                                                                                                                            | @mention scanning across scenes                                                    |
| `collaboration`    | `collaboration.rs`    | ~140  | `save_yjs_state`, `load_yjs_state`, `has_yjs_state`, `delete_yjs_state`                                                                                                                                                                                                      | Yjs CRDT state persistence                                                         |
| `scene_note`       | `scene_note.rs`       | ~105  | `get_scene_note`, `save_scene_note`, `delete_scene_note`                                                                                                                                                                                                                     | Per-scene note CRUD                                                                |
| `google_oauth`     | `google_oauth.rs`     | ~445  | `google_oauth_connect`, `google_oauth_get_access_token`, `google_oauth_get_user`, `google_oauth_sign_out`                                                                                                                                                                     | Desktop OAuth 2.0 via loopback + encrypted SQLite secure storage                   |
| `app_state`        | `app_state.rs`        | ~260  | `app_pref_get`, `app_pref_get_many`, `app_pref_set`, `app_pref_delete`, `list_ai_connections`, `save_ai_connection`, `delete_ai_connection`, model-discovery-cache get/set/clear, `get_app_info`                                                                               | App preferences, AI-connection persistence, model-discovery cache (SQLite)         |

### 5.3 Models — `models/mod.rs`

**7 model files** defining serde-serializable Rust structs:

| Model           | Key Structs                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `project.rs`    | `ProjectMeta`, `ProjectConfig`, `StructureNode`, `RecentProject`                                                   |
| `scene.rs`      | `Scene`, `SceneMeta`                                                                                               |
| `codex.rs`      | `CodexEntry`, `CodexRelation`, `CodexTag`, `CodexEntryTag`, `CodexTemplate`, `CodexRelationType`, `SceneCodexLink` |
| `chat.rs`       | `ChatThread`, `ChatMessage`, `ChatContext`                                                                         |
| `snippet.rs`    | `Snippet`                                                                                                          |
| `backup.rs`     | `EmergencyBackup`                                                                                                  |
| `scene_note.rs` | `SceneNote`                                                                                                        |

> `Series` is defined in `commands/series.rs` (not in `models/`).

### 5.4 Utilities — `utils/mod.rs`

**5 utility modules** (`io`, `paths`, `text`, `timestamp`, `validation`), exposing key functions:

| Function                          | Module       | Purpose                                                |
| --------------------------------- | ------------ | ------------------------------------------------------ |
| `atomic_write` / `atomic_write_bytes` | `io`     | Temp-file-then-rename write to prevent data corruption |
| `now_millis`                      | `timestamp`  | Epoch-millis timestamp generation (`chrono`)           |
| `count_words`                     | `text`       | Word counting for scene statistics                     |
| `project_dir` / `get_app_dir`     | `paths`      | Platform-aware project/app directory resolution        |
| `validate_file_size`              | `validation` | Enforces a caller-supplied max file size               |
| `validate_json_size`              | `validation` | JSON content size validation (`MAX_JSON_SIZE`, 5MB)    |
| `validate_no_null_bytes`          | `validation` | Input sanitization against null byte injection         |

### 5.5 Scene Storage Format

Scene **body text** is stored as a TipTap JSON document in a `.md` file on disk. All **scene metadata** (title, order, status, pov, subtitle, labels, word count, timestamps, etc.) lives in the SQLite `scene_metadata` table — there is no YAML frontmatter.

```
scenes/<scene-file>.md   →  { "type": "doc", "content": [ ... ] }   (body only)
SQLite scene_metadata    →  id, title, order, status, pov, word_count, created_at, updated_at, ...
```

`load_scene()` reads the `.md` body and joins it with the metadata row, returning a `Scene { meta, content }` (the `SceneMeta` struct serializes its `created_at`/`updated_at` as RFC3339 strings). When no metadata row exists yet (a freshly created scene), it falls back to `default_scene_meta()`.

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

**Enforcement:** These boundaries are checked by `dependency-cruiser` (`pnpm deps:check`) and ESLint, not just convention:

- `invoke-only-in-boundary` (error) — Tauri `invoke()`/`@tauri-apps/api/core` may only be imported from `core/` or `infrastructure/`; everything above goes through a repository or a `core/tauri` command-module wrapper. ESLint `no-restricted-imports` mirrors this for editor-time feedback.
- `domain-stays-pure` (error) — `domain/` must not import `infrastructure`/`features`/`hooks`/`store`/`core`/`lib`/`app`.
- `shared-no-app-logic` (error) — `shared/` must not import app-specific layers.
- `lib-no-upward` and `no-cross-feature-deep-import` (warn) — flag `lib/ → features|infrastructure` and deep imports past a feature's public barrel.

### 6.2 Domain Layer — `frontend/domain/`

**Interfaces only** — no implementations. Enables dependency injection and testing.

| Directory           | Files         | Purpose                                                                                                                                                                                                    |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entities/types.ts` | 1 (432 lines) | All entity interfaces (40+)                                                                                                                                                                                |
| `repositories/`     | 14 interfaces | `INodeRepository`, `IProjectRepository`, `ICodexRepository`, `IChatRepository`, `ISnippetRepository`, `ICodexRelationRepository`, `ICodexRelationTypeRepository`, `ICodexTagRepository`, `ICodexTemplateRepository`, `ICollaborationRepository`, `IMentionRepository`, `ISceneCodexLinkRepository`, `ISeriesRepository`, `ISceneNoteRepository` |
| `services/`         | 3 interfaces  | `IChatService`, `IExportService`, `IModelDiscoveryService`                                                                                                                                                  |
| `types/`            | 1 file        | `export-types.ts` — export configuration types                                                                                                                                                             |

### 6.3 Core Layer — `frontend/core/`

| File                                                      | Lines | Purpose                                                                                               |
| --------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `core/tauri/commands.ts` + `core/tauri/command-modules/*` | ~950  | Type-safe `invoke()` wrappers split by domain (project/scene/codex/chat/series/search/export/dialogs); `invoke.ts` guards the Tauri boundary |
| `core/tauri/index.ts`                                     | ~7    | Barrel exports                                                                                        |
| `core/state/app-state.ts`                                 | ~220  | SQLite-backed app preferences, AI connection persistence, and model-discovery cache helpers           |
| `lib/core/save-coordinator.ts`                            | 168   | Singleton preventing race conditions — per-scene mutex, debounce, retry                               |
| `lib/core/editor-state-manager.ts`                        | 234   | VS Code-style dirty tracking, debounced saves, emergency backups, status notifications                |

**Navigation Note:** Project creation now utilizes SPA navigation via `router.push` (Next.js App Router) instead of full page reloads, improving transition performance.

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
                     │   lib/ai/client.ts   │  235 lines
                     │   (Unified AI Client) │
                     │   - getConnection()   │
                     │   - assertMessages()  │
                     └──────────┬──────────┘
                                │ getModel()
                     ┌──────────▼──────────┐
                     │  lib/ai/providers.ts │  56 lines
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

| File                  | Lines | Exports                                                                                                                  | Purpose                                                           |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `lib/ai/index.ts`     | 25    | Barrel                                                                                                                   | Re-exports all client + provider functions                        |
| `lib/ai/client.ts`    | 235   | `generate()`, `stream()`, `object()`, `getEnabledConnections()`, `getConnectionForModel()`, `hasUsableAIConnection()`    | Unified AI client wrapping Vercel AI SDK                          |
| `lib/ai/providers.ts` | 56    | `getModel()`                                                                                                             | Factory creating provider-specific model instances for 14 vendors |

### 7.3 Supported Providers (14)

OpenAI, Anthropic, Google Gemini, Mistral, DeepSeek, Groq, Cohere, xAI (Grok), Azure OpenAI, TogetherAI, Fireworks, Perplexity, OpenRouter, Kimi (Moonshot).

### 7.4 AI Usage Patterns

| Pattern                 | Function                | Consumers                                        |
| ----------------------- | ----------------------- | ------------------------------------------------ |
| **One-shot generation** | `generate()`            | Spark prompts, analysis, text replacement        |
| **Streaming**           | `stream()`              | Chat responses, continue-writing                 |
| **Structured output**   | `object()` (Zod schema) | Spark prompt categorization, analysis            |
| **Connection lookup**   | `getConnection()`       | All — finds enabled connection for model         |
| **Model discovery**     | `ModelDiscoveryService` | Settings — fetches available models per provider |

### 7.5 Context Assembly

1. **ContextEngine** (`assembleContext()` in `features/editor/utils/context-engine.ts`, 311 lines) — Gathers context from structure nodes, scene content, codex entries, and snippets.
2. **ContextPacker** (`packContext()` in `shared/utils/context-packer.ts`, 274 lines) — Token-budget-aware packing. Calculates budget from model specs, truncates blocks to fit within `MIN_CONTEXT_BUDGET_TOKENS` (1500) to `MAX_CONTEXT_BUDGET_CAP_TOKENS` (16000).
3. **Prompt Templates** (`shared/prompts/templates.ts`, 127 lines) — 8 predefined chat system prompts (e.g., Creative Partner, Master Architect, Historian & Geographer).

---

## 8. State Management

### 8.1 Zustand Stores

| Store             | File                         | Lines | Persisted    | State                                                                                                                              |
| ----------------- | ---------------------------- | ----- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `useProjectStore` | `store/use-project-store.ts` | 116   | ✅ (partial) | `viewMode` (plan/write/chat), `activeSceneId`, `activeProjectId`, `activeCodexEntryId`, `showSidebar`, `showTimeline`, `rightPanelTab`, `leftSidebarTab` |
| `useChatStore`    | `store/use-chat-store.ts`    | 45    | ❌           | `activeThreadIds` (per-project map), `threadViews` (per-project map: active/archived/deleted)                                      |
| `useFormatStore`  | `store/use-format-store.ts`  | 93    | ✅ (full)    | Typography (fontFamily, fontSize, lineHeight, textIndent, alignment, paragraphSpacing, pageWidth, sceneDividerStyle), continueInChapter, typewriterMode, typewriterOffset, showLineNumbers, showWordCount, focusMode |

### 8.2 Server State — `useLiveQuery`

Custom hook (`hooks/use-live-query.ts`) providing a React Query-like pattern for Tauri data:

- **Caching** with configurable stale time
- **Invalidation** via `invalidateQueries(patterns)`
- **Background refetch** on window focus
- **Optimistic updates** support

---

## 9. Infrastructure Layer

### 9.1 Dependency Injection — `infrastructure/di/AppContext.tsx` (190 lines)

`AppProvider` constructs concrete repositories/services with `useMemo`, and test suites can inject overrides through `services`.

```typescript
interface AppServices {
  // Repositories
  nodeRepository: INodeRepository; // TauriNodeRepository
  codexRepository: ICodexRepository; // TauriCodexRepository
  chatRepository: IChatRepository; // TauriChatRepository
  snippetRepository: ISnippetRepository; // TauriSnippetRepository
  projectRepository: IProjectRepository; // TauriProjectRepository
  codexRelationRepository: ICodexRelationRepository;
  codexTagRepository: ICodexTagRepository;
  codexTemplateRepository: ICodexTemplateRepository;
  codexRelationTypeRepository: ICodexRelationTypeRepository;
  sceneCodexLinkRepository: ISceneCodexLinkRepository;
  seriesRepository: ISeriesRepository;
  sceneNoteRepository: ISceneNoteRepository;
  collaborationRepository: ICollaborationRepository; // TauriCollaborationRepository
  mentionRepository: IMentionRepository; // TauriMentionRepository

  // Services
  chatService: IChatService; // ChatService
  exportService: IExportService; // DocumentExportService
  modelDiscoveryService: IModelDiscoveryService; // ModelDiscoveryService
  googleAuthService: typeof googleAuthService; // google-auth-service singleton
  googleDriveService: typeof googleDriveService; // google-drive-service singleton
}
```

Test injection via `<AppProvider services={{ nodeRepository: mockRepo }}>`.

### 9.2 Repositories (14 Tauri implementations)

Each wraps `invoke()` calls to Tauri backend commands:

| Repository                      | Lines | Key Operations                                                                                                                                 |
| ------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `TauriNodeRepository`              | ~565  | `getByProject()`, `create()`, `update()`, `delete()`, `getStructure()`, `saveStructure()` — reads active project path from `core/project-path` |
| `TauriProjectRepository`           | ~195  | `get()`, `getAll()`, `create()`, `update()`, `archive()`, `delete()`, `listTrash()`, `restoreFromTrash()`, `getBySeries()`                     |
| `TauriCodexRepository`             | ~170  | `getBySeries()`, `save()`, `delete()` — series-scoped codex entries (SQLite)                                                                   |
| `TauriChatRepository`              | ~360  | Thread/message CRUD, `getMessagesByThread()`                                                                                                   |
| `TauriSnippetRepository`           | ~125  | Snippet CRUD with project-scoped storage                                                                                                       |
| `TauriCodexRelationRepository`     | ~85   | Codex relation CRUD                                                                                                                            |
| `TauriCodexTagRepository`          | ~205  | Codex tag + entry-tag CRUD                                                                                                                     |
| `TauriCodexTemplateRepository`     | ~145  | Codex template CRUD                                                                                                                            |
| `TauriCodexRelationTypeRepository` | ~120  | Codex relation-type CRUD                                                                                                                       |
| `TauriSceneCodexLinkRepository`    | ~220  | Scene↔Codex link CRUD                                                                                                                          |
| `TauriSeriesRepository`            | ~105  | Series lifecycle + series-scoped codex                                                                                                         |
| `TauriSceneNoteRepository`         | ~70   | Per-scene note storage                                                                                                                         |
| `TauriCollaborationRepository`     | ~140  | Yjs snapshot persistence (`save/load/has/deleteYjsState`)                                                                                      |
| `TauriMentionRepository`           | ~120  | @mention scanning across scenes                                                                                                                |

### 9.3 Services

| Service                  | File                                                           | Lines | Purpose                                                                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ChatService`            | `ChatService.ts`                                               | 123   | Orchestrates AI generation: builds context from scenes+codex, assembles conversation history (last 10 messages), calls `generate()`                                                                                                        |
| `DocumentExportService`  | `DocumentExportService.ts` + `document-export/export-utils.ts` | ~1295 | Multi-format export engine with configurable settings: PDF (@react-pdf/renderer), DOCX (docx npm), Markdown. Supports custom fonts, margins, page size, inclusion options, and section-aware content segmentation (`SceneSectionSegment`). |
| `ModelDiscoveryService`  | `ModelDiscoveryService.ts`                                     | ~445  | Singleton with cache. Dynamically fetches models from provider APIs (OpenAI, Anthropic, Google, OpenRouter, etc) with manual model entry support.                                                                                          |
| `EmergencyBackupService` | `emergency-backup-service.ts`                                  | 110   | Emergency backups via Tauri filesystem. Stores in `{project}/.meta/emergency_backups/`. 24-hour expiry.                                                                                                                                    |
| `GoogleAuthService`      | `google-auth-service.ts`                                       | 125   | OAuth 2.0 service. **Desktop:** Uses backend `google_oauth` commands (loopback). Web flow removed.                                                                                                                                         |
| `GoogleDriveService`     | `google-drive-service.ts`                                      | 323   | Drive API: app folder management, backup upload/download/delete, storage quota                                                                                                                                                             |

---

## 10. Feature Modules

### 10.1 Editor Feature — `features/editor/`

The primary writing environment. 15+ components:

| Component             | File                        | Lines | Purpose                                                                                                                 |
| --------------------- | --------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| `TiptapEditor`        | `tiptap-editor.tsx`         | 954   | Main editor orchestrator — TipTap initialization, extension loading, toolbar, save coordination                         |
| `EditorToolbar`       | `editor-toolbar.tsx`        | 173   | Formatting toolbar with text style, alignment, lists, undo/redo (responsive layout)                                     |
| `TextSelectionMenu`   | `text-selection-menu.tsx`   | 330   | Floating tippy.js menu on text selection with 4 AI actions (Tweak, Expand, Rephrase, Shorten) and Link to Codex         |
| `CodexLinkDialog`     | `codex-link-dialog.tsx`     | ~300  | Dialog for linking selected text to codex entries with filtering and role selection                                     |
| `TextReplaceDialog`   | `text-replace-dialog.tsx`   | 477   | AI-powered text replacement dialog with streaming preview, accept/reject                                                |
| `ContinueWritingMenu` | `continue-writing-menu.tsx` | 332   | Dialog for AI text continuation with mode selection (continue/rewrite/summarize), model picker                          |
| `SparkPopover`        | `spark-popover.tsx`         | 446   | AI prompt generator — generates context-aware writing prompts via `generateObject()` with Zod schema-based JSON parsing |
| `FormatMenu`          | `format-menu.tsx`           | ~200  | Typography settings panel (font, size, line height, alignment, page width)                                              |
| `MentionList`         | `mention-list.tsx`          | ~200  | @mention autocomplete for codex entries with alias matching and slash command /link                                     |

**Editor Extensions** (`features/editor/extensions/`): `TypewriterExtension` (cursor centering at configurable offset). Additional custom TipTap extensions live in `lib/tiptap-extensions/`: `section-node` (manuscript section nodes) and `slash-commands` (slash-command menu). @mention support is provided via `@tiptap/extension-mention` + `mention-list.tsx`/`suggestion.ts`.

**Recent Improvements:**

- **Performance**: `tiptap-editor` uses static imports for critical dependencies to improve load time.
- **Stability**: Fixed memory leaks in `NodeActionsMenu` (Blob URL cleanup) and `CollaborationPanel` (timeout cleanup).

### 10.2 Codex Feature — `features/codex/`

| Component            | Lines | Purpose                                                                                         |
| -------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `CodexList`          | 311   | Virtualized scrolling list with category filtering, template selection, search                  |
| `EntityEditor`       | ~400  | Tabbed entity management (Details, Research, Relations, Mentions) with cascading delete support |
| `RelationsTab`       | ~300  | Codex relationship management (within `EntityEditor`)                                           |
| `TrackingTab`        | ~200  | Tracks @mentions of codex entries across the manuscript                                         |

### 10.3 Plan Feature — `features/plan/`

3 views orchestrated by `PlanView` (232 lines):

| View             | File                   | Lines | Purpose                                                                                            |
| ---------------- | ---------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| `GridView`       | `grid-view.tsx`        | 231   | Collapsible Acts/Chapters/Scenes hierarchy                                                         |
| `OutlineView`    | `outline-view.tsx`     | 265   | Tree hierarchy with drag-and-drop reordering                                                       |
| `TimelineView`   | `timeline-view.tsx`    | 162   | Codex-scene matrix showing character/location appearances                                          |
| `SceneLinkPanel` | `scene-link-panel.tsx` | 806   | Sheet-based scene-codex linking interface with unlinked mention detection and consistency warnings |

**Grid Filtering**: The Plan View (Grid) implements structure-preserving filtering via `filterSceneBasedNodes`. It ensures Acts and Chapters remain visible if they match the search query or if no filters are active, providing context even for empty structural nodes.

Scene-codex linking in Grid now uses a dedicated `SceneLinkPanel` workflow:

- Card-level quick action button (not menu-only) for discoverability on touch and desktop.
- Guided panel onboarding with shortcut hints (`Cmd/Ctrl+F` search focus, `Cmd/Ctrl+Shift+L` manual link focus).
- Context-aware linking paths:
  - **Unlinked Mentions**: Detects mentions in scene content (e.g., "Alice") not yet linked to metadata and offers manual linking.
  - **Recommendations**: Suggests links based on scene context (title, summary, POV, labels) vs codex entry names/aliases using a scoring system.
  - **Grouping**: Entries grouped by category (Character, Location, etc.) with color-coded icons.
  - **Roles**: Assign roles to links (Appears, Mentioned, POV Character, Location, Plot Thread).
- **Consistency Checks**: Warns if POV character is linked but not matching scene metadata, or if linked characters are missing from the summary.
- Mutations use live-query invalidation plus duplicate guards to keep badges/filters/timeline state in sync.

### 10.4 Chat Feature — `features/chat/`

| Component         | Lines | Purpose                                                                                                      |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| `ChatInterface`   | 278   | Thread sidebar, message list, input, model/prompt selection. **Mobile:** `w-full`, **Desktop:** `w-[540px]`. |
| `ChatSidebar`     | 286   | Thread list, active thread management, sidebar visibility control (mobile responsive).                       |
| `ChatMessage`     | 351   | Markdown rendering, copy, regenerate, mobile-responsive layout.                                              |
| `ContextSelector` | ~200  | Select scenes, codex entries, snippets as context                                                            |

### 10.5 Navigation — `ProjectNavigation` (489 lines)

Left sidebar tree: manuscript structure (acts/chapters/scenes), codex tabs, snippet list. Drag-and-drop reordering.

### 10.6 Settings — `features/settings/`

| Component          | Lines | Purpose                                                                                   |
| ------------------ | ----- | ----------------------------------------------------------------------------------------- |
| `SettingsDialog`   | 180   | 4-tab dialog orchestrator with theme toggle                                               |
| `AIConnectionsTab` | 171   | AI vendor connection CRUD with model refresh, API key status checks, responsive list view |
| `useAIConnections` | 260   | Hook: CRUD via SQLite commands, secure key-status checks, model discovery                 |

### 10.7 Dashboard — `features/dashboard/`

| Component     | Lines | Purpose                                         |
| ------------- | ----- | ----------------------------------------------- |
| `ProjectGrid` | 38    | Responsive CSS grid for project cards           |
| `ProjectCard` | 127   | Cover image, metadata, responsive dropdown menu |

### 10.8 Other Features

| Feature          | Key Components                                               | Purpose                                                 |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| `ai/`            | `ModelSelector` (`PromptSelector` lives in `features/chat/`)  | AI model dropdown                                       |
| `collaboration/` | `CollaborationPanel` (hook `useCollaboration` lives in `hooks/`) | Yjs + WebRTC P2P editing                             |
| `export/`        | `ExportDialog` (hook `useDocumentExport` lives in `hooks/`)   | Multi-format export UI                                  |
| `search/`        | `SearchPalette`, `SearchInput`, `SearchResults`              | Full-text search via Tauri backend                      |
| `updater/`       | `UpdateNotifier`                                             | Checks for updates on startup, shows toast notification |

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
User action → assembleContext() → packContext() → generate()/stream()/object()
                                                                    │
                                                    getConnection(modelId) → getModel() → Vercel AI SDK → External API
```

### 11.3 Save Flow

```
Editor onChange → EditorStateManager.markDirty() → Debounced save
    → SaveCoordinator.scheduleSave(sceneId) → per-scene serialize → saveSceneById() → invoke("save_scene_by_id")
    → On failure: EmergencyBackupService.saveBackup() → release mutex
```

---

## 12. Storage Architecture

### 12.1 Disk Layout

```
~/BecomeAnAuthor/
├── Projects/{series}/{project}/
│   ├── scenes/{file}.md (body text only; non-text metadata is SQLite-backed)
│   └── .meta/ (runtime artifacts, emergency backups)
└── .meta/app.db (single SQLite source for non-text state)
```

### 12.2 SQLite App State

| Table/Key                                 | Data                                              |
| ----------------------------------------- | ------------------------------------------------- |
| `app_preferences["ui.project_store"]`     | Sidebar/timeline visibility and editor panel tabs |
| `app_preferences["ui.format_settings"]`   | Typography and editor preference state            |
| `app_preferences["ai.last_used_model"]`   | Last selected model for AI generation             |
| `app_preferences["ai.spark_last_model"]`  | Spark popover model preference                    |
| `app_preferences["backup.last_status"]`   | Last backup timestamp/source                      |
| `app_preferences["ui.theme"]`             | Theme selection (`light`/`dark`/`system`)         |
| `app_preferences["ui.sidebar_open"]`      | Sidebar open/closed preference                    |
| `ai_connections` + `ai_connection_models` | AI connection metadata and model mapping          |
| `model_discovery_cache`                   | Provider model discovery cache payloads + TTL     |
| `yjs_snapshots`                           | Latest Yjs update blob per scene                  |

---

## 13. Security Architecture

- **API Keys**: Secrets stored encrypted in SQLite via `security.rs`; no browser storage fallback.
- **OAuth 2.0**:
  - **Desktop:** System browser + localhost loopback + PKCE. Tokens stored in encrypted SQLite (`secure_secrets`) via `google_oauth.rs`.
- **Path Security**: Strict path validation in `scene.rs` and `security.rs` to prevent directory traversal; arbitrary-path commands (`read_file_bytes`, `write_export_file`) reject null bytes, enforce a size cap, and write atomically.
- **Updater Signing**: Updates signed with Minisign private key; app verifies with public key.
- **macOS Release Signing**: CI workflow requires `APPLE_SIGNING_IDENTITY` secret for signed macOS release builds; ad-hoc signing is no longer the default configuration.
- **Input Validation**: `validate_no_null_bytes()`, `validate_json_size()` (`MAX_JSON_SIZE`, 5MB), `validate_file_size()` (caller-supplied max; scenes capped at `MAX_SCENE_SIZE`, 10MB)
- **Atomic Writes**: All backend writes use temp-file-then-rename

---

## 14. Export and Backup System

### 14.1 Export Formats

| Format         | Engine              | Location                           | Notes                                                                                                                                 |
| -------------- | ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| PDF            | @react-pdf/renderer | Frontend (`DocumentExportService`) | Clean prose mention text (no "@"), optional Codex Appendix, and section-aware heading/TOC/page-break controls                         |
| DOCX           | docx (npm)          | Frontend                           | Clean prose mention text, optional Codex Appendix, and section-aware heading/TOC/page-break controls                                  |
| Markdown       | String assembly     | Frontend                           | Clean prose mention text, optional Codex Appendix, and section-aware heading/TOC/page-break controls                                  |
| ePub           | Rust command        | Backend                            |                                                                                                                                       |
| Plain Text     | Rust command        | Backend                            |                                                                                                                                       |
| `.baa` package | Rust commands       | Backend                            | SQL-native ZIP package with `manifest.json`, `db/payload.db`, and `fs/**` payload. Replaces legacy JS frontend import/export schemas. |

### 14.2 Backup Hierarchy

1. **Auto-save** — debounced, per-scene mutex
2. **Emergency backup** — on save failure, 24-hour expiry
3. **Backup Center** — unified local/cloud full snapshot backup (`full_snapshot` `.baa`)
4. **Structured package export** — `series_package` and `novel_package` `.baa` sharing/migration
5. **Google Drive** — OAuth cloud backup/restore for full snapshots only (`.baa`)

The `BackupCenterPanel` now follows package-kind-driven import/export:

- **Backup actions**: local/cloud backup create `full_snapshot` packages only.
- **Inspect before import**: local `.baa` files are validated and summarized before the user confirms.
- **Novel import targeting**: `novel_package` import requires existing/new target series selection.
- **Destructive restore safety**: `full_snapshot` import creates an automatic checkpoint package, performs staged swap, and relaunches the app.

---

## 15. Collaboration Architecture

### 15.1 P2P Stack

```
useCollaboration (hook) → Yjs Doc (CRDT) + y-webrtc (P2P Signaling) + SQLite snapshot persistence
                            │
                            ▼
                   TipTap y-prosemirror binding
```

### 15.2 Components

| Component                 | Purpose                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| `useCollaboration` (hook) | Manages Yjs document lifecycle, WebRTC connection, and SQLite snapshot persistence (`hooks/use-collaboration.ts`) |
| `CollaborationPanel`      | UI panel: connection status, peer list, room sharing                           |

### 15.3 State Persistence

Yjs document state persisted via Tauri commands: `save_yjs_state`, `load_yjs_state`, `has_yjs_state`, `delete_yjs_state`. Stored in SQLite `yjs_snapshots`.

---

## 16. UI Component Library

**26 shared components** in `frontend/components/ui/` (shadcn/ui + Radix):

| Category       | Components                                                                                |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Layout**     | `card`, `dialog`, `sheet`, `tabs`, `scroll-area`, `separator`, `collapsible`, `resizable` |
| **Forms**      | `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `label` |
| **Data**       | `badge`, `skeleton`                                                                       |
| **Feedback**   | `toast` (sonner), `tooltip`, `tippy-popover`                                              |
| **Navigation** | `dropdown-menu`                                                                           |
| **Overlay**    | `alert-dialog`                                                                            |
| **Custom**     | `empty-state`, `decorative-grid`, `save-status-indicator`                                 |

**Design System Updates:**

- **Accessibility**: Comprehensive `aria-label` coverage for icon-only buttons, tabs, and interactive elements.
- **Responsive Design**: Mobile-first grid layouts (`ProjectGrid`, `ExportDialog`) and flexible toolbars (`EditorToolbar`, `TimelineControls`) adapting to viewport width.
- **Layout Fixes**: `ChatSidebar` flex container now correctly handles overflow with `min-h-0` on ScrollArea, preventing layout blowouts. Editor top rails are aligned across navigation, editor, and right panels with restored writing-area focus.

---

## 17. Configuration and Constants

| File                        | Lines | Purpose                                                                |
| --------------------------- | ----- | ---------------------------------------------------------------------- |
| `lib/config/constants.ts`   | ~240  | `GOOGLE_CONFIG` (Client ID), `INFRASTRUCTURE`, limits                  |
| `lib/config/ai-vendors.ts`  | ~230  | 14-vendor provider registry with name, icon, color, default models, endpoints |
| `lib/config/model-specs.ts` | ~200  | Token limits and capabilities per model (context windows)              |
| `lib/config/timing.ts`      | ~40   | `TIMING` object: `SAVE_DEBOUNCE_MS`, `SCENE_NOTE_DEBOUNCE_MS`, `COLLAB_SAVE_INTERVAL_MS`, etc. |

---

## 18. Error Handling and Resilience

### 18.1 Strategy Layers

| Layer      | Mechanism                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Backend    | `Result<T, String>` — errors propagated via IPC                                                  |
| Repository | Try-catch around `invoke()`, scoped `logger`                                                     |
| Service    | Domain error messages, graceful degradation                                                      |
| Hook       | Error states in `useLiveQuery`                                                                   |
| UI         | Toast notifications via `toast-service.ts` (sonner) with state updates (loading → success/error) |

### 18.2 Data Recovery

1. Scene save failure → `EmergencyBackupService.saveBackup()`
2. Missing scene metadata row → `load_scene()` falls back to `default_scene_meta()` (new-scene defaults); a corrupt metadata column surfaces as an error rather than silently discarding data
3. Project deletion → soft delete to `.trash/` with restore (automatically restores/recreates original series if deleted)
4. Import failures → **Import Rollback** automatically reverts partial series imports
5. Expired cleanup → `cleanup_emergency_backups` on startup
6. Atomic writes → temp-file-then-rename pattern

### 18.3 Logging

`shared/utils/logger.ts` — scoped logger with `.scope("ModuleName")` for consistent `log.info/warn/error` output.

---

## 19. Appendix: Complete File Inventory

### 19.1 Frontend — `frontend/` (322 source files)

| Directory                      | Key Files                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `core/tauri/`                  | `commands.ts`, `command-modules/*`, `index.ts`                                                 |
| `core/state/`                  | `app-state.ts`                                                                                 |
| `domain/entities/`             | `types.ts` (432 lines, 40+ interfaces)                                                         |
| `domain/repositories/`         | 14 interface files (`I*Repository.ts`)                                                         |
| `domain/services/`             | `IChatService.ts`, `IExportService.ts`, `IModelDiscoveryService.ts`                            |
| `infrastructure/di/`           | `AppContext.tsx` (190 lines)                                                                   |
| `infrastructure/repositories/` | 14 Tauri implementations                                                                       |
| `infrastructure/services/`     | 6 service implementations                                                                      |
| `lib/ai/`                      | `index.ts`, `client.ts`, `providers.ts`                                                        |
| `lib/config/`                  | `constants.ts`, `ai-vendors.ts`, `model-specs.ts`, `timing.ts`                                 |
| `lib/core/`                    | `save-coordinator.ts`, `editor-state-manager.ts`                                               |
| `store/`                       | `use-project-store.ts`, `use-chat-store.ts`, `use-format-store.ts`                             |
| `hooks/`                       | 22 shared hooks                                                                                |
| `shared/utils/`                | `context-packer.ts`, `toast-service.ts`, `logger.ts`, `scene-sections.ts`, `editor.ts`, `platform.ts` (note: `context-engine.ts` lives in `features/editor/utils/`) |
| `shared/prompts/`              | `templates.ts`                                                                                 |
| `features/editor/`             | ~17 components, 2 hooks, 1 extension (+ `utils/context-engine.ts`)                             |
| `features/codex/`              | ~11 components                                                                                |
| `features/plan/`               | 3 views + orchestrator + filtering utility                                                     |
| `features/chat/`               | ~10 components, 1 hook                                                                         |
| `features/navigation/`         | 2 components                                                                                   |
| `features/settings/`           | ~10 components, 1 hook                                                                         |
| `features/dashboard/`          | 4 components                                                                                   |
| `features/ai/`                 | 1 component                                                                                    |
| `features/collaboration/`      | 1 component (`CollaborationPanel`; `useCollaboration` hook lives in `hooks/`)                  |
| `features/export/`             | 1 component (`useDocumentExport` hook lives in `hooks/`)                                       |
| `features/search/`             | 5 components, 1 hook                                                                           |
| `components/ui/`               | 26 shadcn/ui components                                                                        |

### 19.2 Backend — `backend/src/` (34 source files)

| Directory   | Files                                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root        | `lib.rs` (188 lines), `main.rs`                                                                                                                                                                                     |
| `commands/` | `mod.rs` + 15 modules: `app_state`, `project`, `scene`, `codex`, `chat`, `snippet`, `backup`, `backup_emergency`, `search`, `series`, `security`, `mention`, `collaboration`, `scene_note`, `google_oauth` |
| `models/`   | `mod.rs` + 7 models: `project`, `scene`, `codex`, `chat`, `snippet`, `backup`, `scene_note`                                                                                                                         |
| `utils/`    | `mod.rs` + 5 modules: `io` (`atomic_write`), `paths` (`project_dir`/`get_app_dir`), `text` (`count_words`), `timestamp` (`now_millis`), `validation` (`validate_file_size`/`_json_size`/`_no_null_bytes`) |
| `storage/`  | `mod.rs` + 1 module: `sqlite`                                                                                                                                                                                       |

### 19.3 App Routes — `app/` (8 files)

| File                 | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `layout.tsx`         | Root layout — ThemeProvider, AppProvider, Toaster |
| `page.tsx`           | Dashboard — project list, create, series filter   |
| `loading.tsx`        | Suspense loading placeholder                      |
| `not-found.tsx`      | 404 page                                          |
| `globals.css`        | Global CSS with design tokens                     |
| `project/layout.tsx` | Project workspace layout                          |
| `project/page.tsx`   | Project workspace (editor/plan/chat tabs)         |
| `series/page.tsx`    | Series management                                 |

---

_This architecture document was generated from an exhaustive, file-by-file analysis of every source file in the project._
