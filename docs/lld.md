# Become An Author — Low Level Design Document

> **Version:** 0.0.1
> **Last Updated:** February 20, 2026
> **Status:** Living Document

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Layers](#3-architecture-layers)
4. [Backend Design (Rust / Tauri)](#4-backend-design-rust--tauri)
5. [Frontend Design (Next.js / React)](#5-frontend-design-nextjs--react)
6. [Data Models & Entity Definitions](#6-data-models--entity-definitions)
7. [Repository Layer Design](#7-repository-layer-design)
8. [Service Layer Design](#8-service-layer-design)
9. [Feature Module Design](#9-feature-module-design)
10. [AI Integration Design](#10-ai-integration-design)
11. [State Management](#11-state-management)
12. [IPC Communication Layer](#12-ipc-communication-layer)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [File Storage Design](#14-file-storage-design)
15. [Security Design](#15-security-design)
16. [Error Handling Strategy](#16-error-handling-strategy)
17. [Testing Architecture](#17-testing-architecture)

---

## 1. System Overview

**Become An Author** is a local-first desktop application for novel writing with AI assistance. It is built with **Tauri v2**, combining a **Rust backend** for file-system operations and OS-level functionality with a **Next.js 16 (React 19) frontend** for the user interface.

### Core Principles

| Principle | Implementation |
|---|---|
| **Local-first** | All data stored on local filesystem; no cloud dependency |
| **Privacy-focused** | API keys stored in OS keychain; AI calls made directly from client |
| **Clean Architecture** | Domain-driven design with repository pattern and dependency injection |
| **Feature-modular** | Each feature encapsulated with its own components, hooks, and exports |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Window Shell                     │
├─────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16 / React 19 / TypeScript)          │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ ┌────────────┐     │
│  │ Features │ │   Hooks  │ │ Store │ │ Components │     │
│  └────┬─────┘ └─────┬────┘ └──┬────┘ └────────────┘     │
│       │             │          │                          │
│  ┌────▼─────────────▼──────────▼────┐                    │
│  │   Infrastructure / DI Container   │                   │
│  │    (AppContext + Repositories)     │                   │
│  └────────────────┬──────────────────┘                   │
│                   │ Tauri IPC (invoke)                    │
├───────────────────▼─────────────────────────────────────┤
│  Backend (Rust / Tauri v2)                               │
│  ┌──────────┐  ┌────────┐  ┌───────┐                    │
│  │ Commands │  │ Models │  │ Utils │                     │
│  └─────┬────┘  └────────┘  └───────┘                    │
│        │                                                 │
│  ┌─────▼─────────────────────────────────────┐          │
│  │   File System / OS Keychain / OS APIs      │          │
│  └────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.0.3 |
| UI Library | React | 19.2.0 |
| Language | TypeScript | 5.x |
| Styling | TailwindCSS | 4.x |
| State | Zustand | 5.0.9 |
| Rich Editor | TipTap | 3.11+ |
| Collaboration | Yjs + y-webrtc + y-indexeddb | 13.6.28 |
| Forms | React Hook Form + Zod | 7.68 / 4.1 |
| UI Primitives | Radix UI | Various |
| AI SDK | Vercel AI SDK (`ai`) | 6.0.3 |
| Search | Backend `search_project` command | Rust std/walkdir |
| Charts | Recharts | 3.6.0 |
| Drag & Drop | @dnd-kit | 6.3+ |
| Markdown | react-markdown + marked | 10.1 / 17.0 |
| Export | docx (npm), JSZip, html2pdf.js, DOMPurify | Various |
| Package Manager | pnpm | 10.29.2 |

### Backend

| Category | Technology | Version |
|---|---|---|
| Runtime | Tauri | 2.1 |
| Language | Rust | Edition 2021 (1.77.2+) |
| Serialization | serde + serde_json + serde_yaml | 1.x |
| IDs | uuid v4 | 1.x |
| Time | chrono | 0.4 |
| File Ops | walkdir | 2.x |
| Markdown | gray_matter | 0.2 |
| Doc Gen | docx-rs (legacy), epub-builder | 0.4 / 0.7 |
| Secret Store | keyring (OS keychain) | 2.3 |
| Logging | tauri-plugin-log | 2.1 |

---

## 3. Architecture Layers

The frontend follows an 8-layer Clean Architecture:

```
Layer 1: UI Components       → frontend/components/ui/
Layer 2: Feature Components   → frontend/features/*/components/
Layer 3: Custom Hooks         → frontend/hooks/ + frontend/features/*/hooks/
Layer 4: Domain Repository    → frontend/domain/repositories/ (interfaces)
         Interfaces
Layer 5: Domain Entities      → frontend/domain/entities/types.ts
         & Types
Layer 6: Domain Services      → frontend/domain/services/ (interfaces)
Layer 7: Infrastructure       → frontend/infrastructure/repositories/ (Tauri impls)
         Implementations       frontend/infrastructure/services/
Layer 8: Core / IPC Bridge    → frontend/core/tauri/commands.ts
```

**Dependency Rule:** Each layer may only depend on layers below it (higher number). Features depend on hooks, hooks depend on domain interfaces, infrastructure implements domain interfaces.

---

## 4. Backend Design (Rust / Tauri)

### 4.1 Module Organization

```
backend/src/
├── main.rs              # Tauri entry point (calls lib::run())
├── lib.rs               # Plugin registration + command handler registration (130+ commands)
├── commands/            # Tauri command implementations (18 modules)
│   ├── mod.rs           # Module declarations and re-exports
│   ├── project.rs       # Project CRUD, structure, node management (32KB)
│   ├── scene.rs         # Scene load/save with YAML frontmatter + strict validation (370 lines)
│   ├── codex.rs         # Codex entries, relations, tags, templates (12KB)
│   ├── series.rs        # Series management + series codex (16.5KB)
│   ├── chat.rs          # Chat threads and messages CRUD (6.8KB)
│   ├── search.rs        # Full-text search across project (7.3KB)
│   ├── backup.rs        # Emergency backup + export/import (40KB)
│   ├── trash.rs         # Soft delete with restore + UUID validation (200 lines)
│   ├── security.rs      # OS keychain API key management (5.9KB)
│   ├── mention.rs       # Cross-content mention tracking (8.6KB)
│   ├── collaboration.rs # Yjs state persistence (2.1KB)
│   ├── snippet.rs       # Reusable text snippets (1.6KB)
│   ├── idea.rs          # Quick idea capture (1.8KB)
│   ├── scene_note.rs    # Per-scene notes (1.4KB)
│   ├── world_map.rs     # Map management with image upload (2.7KB)
│   ├── world_timeline.rs# World-level timeline events (1.8KB)
│   ├── preset.rs        # Custom AI presets (1.8KB)
│   └── google_oauth.rs  # Desktop OAuth via loopback + keyring (15KB)
├── models/              # Data structures (11 modules)
│   ├── mod.rs
│   ├── project.rs       # ProjectMeta, StructureNode, Series
│   ├── scene.rs         # SceneMeta, Scene, YamlSceneMeta
│   ├── codex.rs         # CodexEntry, CodexRelation, CodexTag, CodexTemplate, ...
│   ├── chat.rs          # ChatThread, ChatMessage, ChatThreadWithMessages
│   ├── snippet.rs       # Snippet
│   ├── backup.rs        # EmergencyBackup
│   ├── idea.rs          # Idea
│   ├── scene_note.rs    # SceneNote
│   ├── world_map.rs     # ProjectMap
│   └── world_timeline.rs# WorldEvent
└── utils/               # Shared utilities (7 modules)
    ├── mod.rs
    ├── paths.rs         # App dir, project dir, series dir resolution
    ├── io.rs            # File read/write helpers
    ├── text.rs          # Text processing (word count, slugify)
    ├── validation.rs    # Input validation rules (10.7KB)
    ├── timestamp.rs     # RFC 3339 ↔ Unix timestamp conversion
    └── security.rs      # Keyring operations wrapper
```

### 4.2 Command Pattern

Every Tauri command follows this pattern:

```rust
#[tauri::command]
pub fn command_name(param1: Type1, param2: Type2) -> Result<ReturnType, String> {
    // 1. Validate inputs (utils/validation.rs)
    // 2. Resolve file paths (utils/paths.rs)
    // 3. Read/write to filesystem (utils/io.rs)
    // 4. Serialize/deserialize with serde
    // 5. Return Result<T, String>
}
```

- All errors are marshalled as `String` for IPC compatibility
- All timestamps use RFC 3339 for storage and IPC; Repositories convert to Unix millis for domain entities
- UUIDs generated via `uuid::Uuid::new_v4()`

### 4.3 File System Layout (Runtime Data)

```
~/BecomeAnAuthor/{dev|release}/
├── Projects/
│   └── {project-slug}/
│       ├── project.json          # ProjectMeta
│       ├── structure.json        # StructureNode[]
│       ├── scenes/
│       │   └── {scene-id}.md     # YAML frontmatter + markdown content
│       ├── codex/
│       │   └── {entry-id}.json   # CodexEntry
│       ├── codex-relations.json  # CodexRelation[]
│       ├── codex-tags.json       # CodexTag[]
│       ├── codex-entry-tags.json # CodexEntryTag[]
│       ├── codex-templates.json  # CodexTemplate[]
│       ├── codex-relation-types.json
│       ├── scene-codex-links.json
│       ├── chat/
│       │   └── {thread-id}.json  # ChatThread + ChatMessage[]
│       ├── snippets/
│       │   └── {snippet-id}.json
│       ├── ideas.json            # Idea[]
│       ├── scene-notes/
│       │   └── {scene-id}.json
│       ├── maps/
│       │   └── {map-id}.json
│       ├── world-events.json     # WorldEvent[]
│       ├── yjs/                  # Collaboration state
│       ├── trash/                # Soft-deleted items
│       └── .backups/             # Emergency backups
├── series/
│   └── {series-id}/
│       └── codex/                # Series-level codex entries
├── .meta/
│   ├── series.json               # All series metadata
│   ├── recent.json               # Recently opened projects
│   └── presets.json              # Custom AI presets
└── .trash/                       # Trashed projects
```

### 4.4 Scene File Format

Scenes use a YAML frontmatter + Markdown body format:

```markdown
---
id: "abc-123"
title: "Chapter One"
order: 0
status: "draft"
wordCount: 1234
povCharacter: "Alice"
labels: ["action", "intro"]
excludeFromAI: false
summary: "Alice discovers the portal"
createdAt: "2025-12-01T10:00:00Z"
updatedAt: "2025-12-15T14:30:00Z"
---

The story content goes here in Markdown format...
```

Parsed by the Rust backend using `gray_matter` for frontmatter extraction and `serde_yaml` for deserialization into `YamlSceneMeta`.

---

## 5. Frontend Design (Next.js / React)

### 5.1 App Routes

```
app/
├── layout.tsx            # Root layout with ThemeProvider, AppProvider, ErrorBoundary
├── page.tsx              # Dashboard (project listing, series, trash management)
├── globals.css           # Global styles + Tailwind config
├── loading.tsx           # Loading spinner
├── not-found.tsx         # 404 page
├── auth/                 # OAuth callback handling (Google Drive)
├── project/
│   └── [id]/
│       └── page.tsx      # Main project workspace (editor, plan, chat views)
└── series/
    └── [id]/
        └── page.tsx      # Series management view
```

### 5.2 Provider Tree

```tsx
<html>
  <body>
    <ThemeProvider>           {/* next-themes: dark/light/system */}
      <TooltipProvider>       {/* Radix UI tooltip context */}
        <AppProvider>         {/* DI container — all repos + services */}
          <ErrorBoundary>     {/* Global error catch */}
            {children}
          </ErrorBoundary>
        </AppProvider>
      </TooltipProvider>
    </ThemeProvider>
    <ToastProvider />         {/* Sonner toast notifications */}
  </body>
</html>
```

### 5.3 Dependency Injection Container

**File:** `frontend/infrastructure/di/AppContext.tsx`

The `AppProvider` creates singleton instances of all repositories and services via React Context, using **lazy initialization** with a Proxy-based factory pattern:

```typescript
interface AppServices {
  // Repositories (17 total)
  nodeRepository: INodeRepository;
  projectRepository: IProjectRepository;
  codexRepository: ICodexRepository;
  chatRepository: IChatRepository;
  seriesRepository: ISeriesRepository;
  snippetRepository: ISnippetRepository;
  codexRelationRepository: ICodexRelationRepository;
  codexRelationTypeRepository: ICodexRelationTypeRepository;
  codexTagRepository: ICodexTagRepository;
  codexTemplateRepository: ICodexTemplateRepository;
  sceneCodexLinkRepository: ISceneCodexLinkRepository;
  collaborationRepository: ICollaborationRepository;
  mentionRepository: IMentionRepository;
  ideaRepository: IIdeaRepository;
  sceneNoteRepository: ISceneNoteRepository;
  mapRepository: IMapRepository;
  worldTimelineRepository: IWorldTimelineRepository;

  // Services (2 in DI)
  chatService: IChatService;
  exportService: IExportService;
}
```

Custom services can be injected in tests:
```tsx
<AppProvider services={{ nodeRepository: mockNodeRepo }}>
  <ComponentUnderTest />
</AppProvider>
```

Accessed via `useAppServices()` hook, which throws if used outside provider.

---

## 6. Data Models & Entity Definitions

**File:** `frontend/domain/entities/types.ts` (529 lines, 30+ types)

### 6.1 Core Entity Hierarchy

```
BaseNode
├── id: string
├── projectId: string
├── parentId: string | null
├── title: string
├── order: number
├── expanded: boolean
├── archived?: boolean
├── createdAt: number (Unix ms)
└── updatedAt: number (Unix ms)

Act extends BaseNode        { type: "act" }
Chapter extends BaseNode    { type: "chapter" }
Scene extends BaseNode      { type: "scene", content: TiptapContent, status, wordCount, ... }

DocumentNode = Act | Chapter | Scene
```

### 6.2 Key Entity Types

| Entity | Key Fields | Storage |
|---|---|---|
| `Project` | id, title, author, seriesId, seriesIndex, language, coverImage | `project.json` |
| `Series` | id, title, description, author, genre, status | `series.json` |
| `Scene` | BaseNode + content (TipTap JSON), status (draft/revised/final), wordCount, beats, pov, labels | `{id}.md` |
| `CodexEntry` | id, name, category (character/location/item/lore/subplot), aliases, attributes, tags, aiContext, templateId, customFields | `{id}.json` |
| `CodexRelation` | id, parentId, childId, typeId, label, strength | `codex-relations.json` |
| `ChatThread` | id, projectId, name, pinned, archived, defaultModel | `{id}.json` |
| `ChatMessage` | id, threadId, role (user/assistant), content, model, context | Embedded in thread |
| `Snippet` | id, projectId, title, content (TipTap), pinned | `{id}.json` |
| `Idea` | id, projectId, content, category, tags, archived | `ideas.json` |
| `SceneNote` | id, sceneId, content (TipTap) | `{id}.json` |
| `ProjectMap` | id, projectId, name, imageUrl, pins | `{id}.json` |
| `WorldEvent` | id, projectId, title, date, description, linkedScenes | `world-events.json` |
| `Mention` | id, codexEntryId, sourceType, sourceId, position, context | Runtime |

### 6.3 Supporting Types

- `Beat` — Scene outline beat (id, text, isCompleted)
- `Section` — Editor section within a scene
- `CodexAddition` — Scene-codex link
- `CodexTag`, `CodexEntryTag`, `CodexTemplate`, `CodexRelationType`, `SceneCodexLink`
- `ChatContext` — Contextual data for AI (novelText, acts, chapters, scenes, snippets, codexEntries)
- `AIConnection` — Provider config (provider, apiKey, models, customEndpoint, enabled)
- `TrashedProject` — Soft-deleted project metadata

---

## 7. Repository Layer Design

### 7.1 Repository Interfaces (Domain Layer)

**Directory:** `frontend/domain/repositories/` (17 interfaces)

Each interface defines a contract for data access:

```typescript
// Example: INodeRepository
interface INodeRepository {
  getStructure(projectId: string): Promise<DocumentNode[]>;
  saveStructure(projectId: string, nodes: DocumentNode[]): Promise<void>;
  createNode(projectId: string, node: Partial<DocumentNode>): Promise<DocumentNode>;
  renameNode(projectId: string, nodeId: string, title: string): Promise<void>;
  deleteNode(projectId: string, nodeId: string): Promise<void>;
  loadScene(projectId: string, sceneId: string): Promise<Scene>;
  saveScene(projectId: string, scene: Scene): Promise<void>;
}
```

**Complete list:**

| Interface | Responsibility |
|---|---|
| `INodeRepository` | Manuscript tree structure + scene CRUD |
| `IProjectRepository` | Project metadata CRUD |
| `ISeriesRepository` | Series management |
| `ICodexRepository` | Codex entry CRUD |
| `ICodexRelationRepository` | Codex entity relationships |
| `ICodexRelationTypeRepository` | Relationship type definitions |
| `ICodexTagRepository` | Tag + entry-tag management |
| `ICodexTemplateRepository` | Codex templates |
| `ISceneCodexLinkRepository` | Scene ↔ codex entry links |
| `IChatRepository` | Chat threads + messages |
| `ISnippetRepository` | Text snippets |
| `IIdeaRepository` | Quick idea capture |
| `ISceneNoteRepository` | Per-scene notes |
| `IMapRepository` | World maps with pins |
| `IWorldTimelineRepository` | World-level timeline events |
| `ICollaborationRepository` | Yjs CRDT state persistence |
| `IMentionRepository` | Cross-content mention tracking |

### 7.2 Tauri Repository Implementations (Infrastructure)

**Directory:** `frontend/infrastructure/repositories/` (17 implementations)

Each implementation wraps Tauri IPC `invoke()` calls:

```typescript
// Example: TauriNodeRepository implements INodeRepository
export class TauriNodeRepository implements INodeRepository {
  async getStructure(projectPath: string): Promise<DocumentNode[]> {
    return invoke<StructureNode[]>("get_structure", { projectPath });
  }
  // ... other methods mapping to Tauri commands
}
```

**Key pattern:** Frontend TypeScript interface → Tauri `invoke()` → Rust command → File system

### 7.3 Hook-Based Repository Access

Each repository has a corresponding custom hook for React component consumption:

```typescript
// frontend/hooks/use-node-repository.ts
export function useNodeRepository() {
  const { nodeRepository } = useAppServices();
  return nodeRepository;
}
```

These hooks are the **only** way components access data—ensuring DI and testability.

---

## 8. Service Layer Design

### 8.1 Service Interfaces (Domain)

**Directory:** `frontend/domain/services/`

| Interface | Responsibility |
|---|---|
| `IChatService` | Chat thread management with AI message generation |
| `IExportService` | Document export to DOCX, EPUB, PDF, JSON, backup |
| `IModelDiscoveryService` | AI model enumeration per provider |

### 8.2 Service Implementations (Infrastructure)

**Directory:** `frontend/infrastructure/services/`

| Service | File | Size | Description |
|---|---|---|---|
| `ChatService` | `ChatService.ts` | 3.8KB | Thread CRUD + AI message streaming |
| `DocumentExportService` | `DocumentExportService.ts` | 950 lines | Full manuscript export (DOCX/PDF via frontend with presets, ePub via backend). Includes live preview & DOMPurify sanitization. |
| `ModelDiscoveryService` | `ModelDiscoveryService.ts` | 500 lines | Fetches models per provider. Implements caching (localStorage + TTL) and dynamic fetching for 7+ providers. |
| `EmergencyBackupService` | `emergency-backup-service.ts` | 4KB | Auto-save crash recovery |
| `GoogleAuthService` | `google-auth-service.ts` | 9.0KB | Google OAuth 2.0 (Desktop: invoke backend / Web: PKCE) |
| `GoogleDriveService` | `google-drive-service.ts` | 8.9KB | Google Drive sync/backup |

---

## 9. Feature Module Design

**Directory:** `frontend/features/` (18 feature modules)

Each feature follows a consistent internal structure:

```
features/{feature-name}/
├── components/       # React components (feature-specific)
├── hooks/            # Feature-specific hooks
├── utils/            # Feature-specific utilities
└── index.ts          # Public API barrel export
```

### 9.1 Feature Module Inventory

| Feature | Components | Hooks | Description |
|---|---|---|---|
| **editor** | 22 | 2 | TipTap rich text editor, toolbars, AI menus, focus mode, formatting |
| **chat** | 10 | 1 | AI chat interface with thread management, context assembly |
| **codex** | 14 | 0 | World-building encyclopedia (entities, relations, tags, templates) |
| **plan** | 12 | 2 | Outline view, grid view, timeline, maps, world timeline |
| **settings** | 10 | 2 | AI connections, appearance, editor preferences |
| **dashboard** | 6 | 0 | Project grid, cards, empty state, header |
| **search** | 6 | 1 | Full-text search across scenes + codex |
| **series** | 5 | 0 | Series management, project ordering |
| **snippets** | 3 | 0 | Reusable text snippets |
| **export** | 1 | 2 | Export dialog with format selection |
| **navigation** | 3 | 1 | Sidebar, breadcrumbs, navigation state |
| **data-management** | 2 | 0 | Import/export of project data |
| **google-drive** | 2 | 2 | Google Drive backup integration |
| **collaboration** | 1 | 0 | Real-time collaboration via Yjs |
| **ai** | 1 | 0 | AI-specific UI components |
| **project** | 2 | 0 | Project-level settings and metadata |
| **updater** | 1 | 0 | UpdateNotifier component |
| **shared** | 5 | 0 | ErrorBoundary, ThemeProvider, LoadingSpinner, withErrorBoundary HOC |

### 9.2 Editor Feature (Deep Dive)

The editor is the largest feature module (27 items):

```
features/editor/
├── components/
│   ├── tiptap-editor.tsx          # Main TipTap editor wrapper
│   ├── EditorContainer.tsx        # Editor layout container
│   ├── editor-toolbar.tsx         # Formatting toolbar
│   ├── text-selection-menu.tsx    # Floating menu on text select
│   ├── text-replace-dialog.tsx    # AI rewrite dialog
│   ├── tweak-generate-dialog.tsx  # AI generation tuning
│   ├── continue-writing-menu.tsx  # AI continuation
│   ├── spark-popover.tsx          # AI spark suggestions
│   ├── format-menu.tsx            # Format options panel
│   ├── scene-notes-panel.tsx      # Per-scene notes
│   ├── write-right-panel.tsx      # Right sidebar panel
│   ├── story-timeline.tsx         # Visual timeline
│   ├── FocusModeToggle.tsx        # Distraction-free toggle
│   ├── NodeActionsMenu.tsx        # Context menu for nodes
│   └── section-component.tsx      # Custom section block
├── extensions/
│   └── TypewriterExtension.ts     # Typewriter scroll mode
├── hooks/
│   ├── use-scene-note.ts          # Scene note data hook
│   └── useEditorState.ts          # Editor state management
└── index.ts                       # Public API (25 exports)
```

**TipTap Extensions Used:**
- StarterKit (bold, italic, lists, etc.)
- CharacterCount
- Placeholder
- Typography
- Mention (with custom @-mention suggestions)
- Collaboration (Yjs integration)
- BubbleMenu
- Custom: SlashCommands, SectionNode, TypewriterExtension

---

## 10. AI Integration Design

### 10.1 Architecture

```
┌──────────────────────────────────────┐
│         AI Client (lib/ai/client.ts) │
│  ┌────────────────────────────────┐  │
│  │  generate()  stream()  object()│  │
│  └───────────────┬────────────────┘  │
│                  │                   │
│  ┌───────────────▼────────────────┐  │
│  │  Provider Factory               │  │
│  │  (lib/ai/providers.ts)          │  │
│  │  14 providers via Vercel AI SDK │  │
│  └───────────────┬────────────────┘  │
│                  │                   │
│  ┌───────────────▼────────────────┐  │
│  │  Connection Storage             │  │
│  │  (core/storage/safe-storage)    │  │
│  │  + OS Keychain for API keys     │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### 10.2 Supported Providers (14)

| Provider | SDK Package | Custom Endpoint |
|---|---|---|
| OpenAI | `@ai-sdk/openai` | ✅ |
| Anthropic | `@ai-sdk/anthropic` | ❌ |
| Google | `@ai-sdk/google` | ❌ |
| Mistral | `@ai-sdk/mistral` | ❌ |
| DeepSeek | `@ai-sdk/deepseek` | ❌ |
| Groq | `@ai-sdk/groq` | ❌ |
| Cohere | `@ai-sdk/cohere` | ❌ |
| xAI (Grok) | `@ai-sdk/xai` | ❌ |
| Azure OpenAI | `@ai-sdk/azure` | ✅ |
| Together AI | `@ai-sdk/togetherai` | ❌ |
| Fireworks | `@ai-sdk/fireworks` | ❌ |
| Perplexity | `@ai-sdk/perplexity` | ❌ |
| OpenRouter | `@openrouter/ai-sdk-provider` | ❌ |
| Kimi (Moonshot) | `@ai-sdk/openai` (compatible) | Hardcoded |

### 10.3 AI Client API

```typescript
// One-shot generation
generate(opts: GenerateOptions): Promise<GenerateResult>

// Streaming generation (chat, rewrites)
stream(opts: GenerateOptions): Promise<StreamResult>

// Structured output with Zod schema validation
object<T>(opts: GenerateObjectOptions<T>): Promise<ObjectResult<T>>
```

### 10.4 Context Assembly

**File:** `frontend/hooks/use-context-assembly.ts` (9.6KB)

Assembles contextual information for AI prompts:
- Full novel text or outline
- Selected acts, chapters, scenes
- Codex entries (always/detected/never based on aiContext setting)
- Snippet content
- Token budget management via `lib/ai/token-calculator.ts`

---

## 11. State Management

### 11.1 Zustand Stores

**Directory:** `frontend/store/`

| Store | File | Persistence | Purpose |
|---|---|---|---|
| `useProjectStore` | `use-project-store.ts` | `zustand/persist` (localStorage) | Active scene, view mode (plan/write/chat), panel visibility, active tabs |
| `useChatStore` | `use-chat-store.ts` | None | Active chat thread state |
| `useFormatStore` | `use-format-store.ts` | `zustand/persist` | Editor formatting preferences |

### 11.2 ProjectStore State Shape

```typescript
interface ProjectStore {
  activeSceneId: string | null;
  viewMode: "plan" | "write" | "chat";
  activeProjectId: string | null;
  activeCodexEntryId: string | null;
  showSidebar: boolean;
  showTimeline: boolean;
  rightPanelTab: "timeline" | "notes";
  leftSidebarTab: "manuscript" | "codex" | "snippets";
  // + setter functions and toggle functions
}
```

**Persistence:** Only UI layout preferences (sidebar, timeline, panel tabs) are persisted. Active IDs reset on app restart.

---

## 12. IPC Communication Layer

### 12.1 Tauri Command Bridge

**File:** `frontend/core/tauri/commands.ts` (993 lines, 135+ exports)

This file provides typed TypeScript wrappers around all 130+ Tauri backend commands:

```typescript
// Type-safe invoke wrapper
export async function loadScene(
  projectPath: string,
  sceneId: string,
): Promise<Scene> {
  return invoke<Scene>("load_scene", { projectPath, sceneId });
}
```

### 12.2 Command Categories

| Category | Commands | Examples |
|---|---|---|
| **Project** | 18 | `list_projects`, `create_project`, `delete_project`, `get_structure`, `save_structure`, `create_node` |
| **Scene** | 5 | `load_scene`, `save_scene`, `update_scene_metadata`, `delete_scene` |
| **Codex** | 18 | `list_codex_entries`, `save_codex_entry`, relations, tags, templates, relation types, scene links |
| **Chat** | 8 | `list_chat_threads`, `create_chat_thread`, `get_chat_messages`, `create_chat_message` |
| **Series** | 15 | `list_series`, `create_series`, series codex, `migrate_codex_to_series` |
| **Search** | 1 | `search_project` |
| **Trash** | 5 | `move_to_trash`, `restore_from_trash`, `list_trash`, `permanent_delete`, `empty_trash` |
| **Export** | 9 | `export_manuscript_text`, `export_manuscript_docx`, `export_manuscript_epub`, `export_project_backup` |
| **Import** | 2 | `import_series_backup`, `import_project_backup` |
| **Security** | 4 | `store_api_key`, `get_api_key`, `delete_api_key`, `list_api_key_providers` |
| **Backup** | 4 | `save_emergency_backup`, `get_emergency_backup`, `cleanup_emergency_backups` |
| **Mention** | 2 | `find_mentions`, `count_mentions` |
| **Collaboration** | 4 | `save_yjs_state`, `load_yjs_state`, `has_yjs_state`, `delete_yjs_state` |
| **Google OAuth** | 4 | `google_oauth_connect`, `get_access_token`, `get_user`, `sign_out` |
| **Other** | ~10 | Ideas, scene notes, maps, world events, presets, app info |

### 12.3 Environment Detection

```typescript
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
```

---

## 13. Data Flow Diagrams

### 13.1 Scene Save Flow

```
User types in TipTap Editor
        │
        ▼
EditorContainer (debounced onChange)
        │
        ▼
SaveCoordinator (lib/core/save-coordinator.ts)
  - Debounce (configurable delay)
  - Conflict detection
  - Emergency backup on failure
        │
        ▼
useNodeRepository() → INodeRepository.saveScene()
        │
        ▼
TauriNodeRepository.saveScene()
  → invoke("save_scene", { projectPath, sceneId, content, metadata })
        │
        ▼
Rust: commands::scene::save_scene()
  1. Serialize metadata as YAML frontmatter
  2. Combine with markdown content
  3. Write to ~/BecomeAnAuthor/{channel}/Projects/{path}/scenes/{id}.md
  4. Return updated SceneMeta
```

### 13.2 AI Chat Flow

```
User sends message in ChatInterface
        │
        ▼
useAI() hook (hooks/use-ai.ts, 7.6KB)
  1. Assemble context (useContextAssembly)
  2. Build system prompt (shared/prompts/)
  3. Prepend manuscript context
        │
        ▼
AI Client: stream(opts)
  1. Find connection for model (storage)
  2. Create provider instance
  3. Call Vercel AI SDK streamText()
        │
        ▼
Stream chunks → ChatMessage component
        │
        ▼
On complete → chatRepository.createMessage()
  → invoke("create_chat_message", { ... })
        │
        ▼
Rust: commands::chat::create_chat_message()
  → Append to chat/{threadId}.json
```

---

## 14. File Storage Design

### 14.1 Storage Strategy

| Data Type | Format | Location |
|---|---|---|
| Project metadata | JSON | `project.json` |
| Manuscript structure | JSON | `structure.json` |
| Scenes | YAML frontmatter + Markdown | `scenes/{id}.md` |
| Codex entries | JSON (individual files) | `codex/{id}.json` |
| Chat threads | JSON (thread + messages) | `chat/{id}.json` |
| Snippets | JSON | `snippets/{id}.json` |
| Ideas | JSON (single array file) | `ideas.json` |
| Scene notes | JSON | `scene-notes/{id}.json` |
| Maps | JSON | `maps/{id}.json` |
| World events | JSON (single array file) | `world-events.json` |
| Series metadata | JSON (global) | `.meta/series.json` |
| Recent projects | JSON (global) | `.meta/recent.json` |
| Yjs docs | IndexedDB (y-indexeddb) | CRDT document state for offline |
| Emergency backups | JSON | `.backups/{timestamp}.json` |

### 14.2 Client-Side Storage

| Store | Technology | Purpose |
|---|---|---|
| AI connections | `localStorage` (safe-storage wrapper) | Provider configs with encrypted keys |
| UI preferences | `localStorage` via Zustand persist | Panel states, view modes |
| Editor format | `localStorage` via Zustand persist | Font, spacing, width preferences |
| Yjs docs | IndexedDB (y-indexeddb) | CRDT document state for offline |

---

## 15. Security Design

### 15.1 API Key Storage

```
User enters API key in Settings
        │
        ▼
Frontend: invoke("store_api_key", { provider, key })
        │
        ▼
Rust: security::store_api_key()
  → keyring::Entry::new("become-an-author", provider)
  → entry.set_password(key)
        │
        ▼
OS Keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service)
```

- Keys are **never** stored in the filesystem or localStorage.
- Retrieval via `get_api_key(provider)` → OS keychain lookup.
- **Google OAuth Tokens**: Also stored in `keyring` (Service: `com.becomeauthor.app`, Account: `google-oauth-tokens`).

### 15.2 Content Security

- Tauri CSP set to `null` (permissive for local app)
- Asset protocol scoped to `$DOCUMENT/**` and `$HOME/Documents/**`
- DOMPurify used for sanitizing HTML content
- Zod validation on all form inputs

---

## 16. Error Handling Strategy

### 16.1 Frontend Error Boundaries

- Global `ErrorBoundary` wraps the entire app
- Feature-level error boundaries via `withErrorBoundary()` HOC:
  ```typescript
  export const ChatInterface = withErrorBoundary(ChatInterfaceBase, {
    name: "Chat Interface",
    maxRetries: 3,
  });
  ```
- Toast notifications via Sonner for user-facing errors
- Console logging for development debugging

### 16.2 Backend Error Pattern

All Rust commands return `Result<T, String>`:
- Validation errors include descriptive messages
- File I/O errors are mapped to user-friendly strings
- Path resolution failures include the attempted path

### 16.3 Emergency Backup System

`EmergencyBackupService` provides crash recovery:
- Auto-saves content on write failures
- Stored in `.backups/` with timestamps
- Cleanup of old backups on successful save
- Retrieval on app restart

---

## 17. Testing Architecture

### 17.1 Test Setup

| Tool | Purpose |
|---|---|
| Vitest | Test runner (4.0.15) |
| Testing Library | React component testing |
| happy-dom / jsdom | DOM environment |
| MSW | API mocking |
| fake-indexeddb | IndexedDB mocking for Yjs tests |

### 17.2 Test Organization

```
frontend/
├── test/
│   ├── setup.ts              # Global test setup
│   ├── test-utils.tsx         # Custom render with providers
│   ├── fixtures/              # Test data factories
│   └── mocks/                 # Mock implementations (3 files)
├── hooks/__tests__/           # Hook unit tests
├── components/__tests__/      # Component tests
├── infrastructure/
│   ├── repositories/__tests__/
│   └── services/__tests__/    # Service unit tests (3 files)
└── lib/
    ├── ai/__tests__/          # AI client tests
    └── core/__tests__/        # Editor state + save coordinator tests
```

### 17.3 DI-Based Testing

The `AppProvider` accepts custom services for test injection:
```tsx
const mockNodeRepo = { getStructure: vi.fn(), ... };
render(
  <AppProvider services={{ nodeRepository: mockNodeRepo }}>
    <EditorContainer />
  </AppProvider>
);
```

---

## Component Library (UI Layer)

**Directory:** `frontend/components/ui/` (37 components + 2 subdirectories)

| Component | Description |
|---|---|
| `button`, `input`, `textarea`, `label` | Form primitives |
| `dialog`, `alert-dialog`, `sheet` | Modal/overlay components |
| `select`, `checkbox`, `switch`, `radio-group`, `slider` | Form controls |
| `dropdown-menu`, `popover`, `tooltip`, `command` | Interaction patterns |
| `tabs`, `collapsible`, `collapsible-section` | Layout components |
| `card`, `badge`, `separator`, `skeleton` | Display components |
| `scroll-area`, `progress`, `resizable` | Utility components |
| `tag-input`, `time-wheel-picker` | Specialized inputs |
| `save-status-indicator` | Save state display |
| `quick-capture-modal` | Quick idea entry |
| `empty-state`, `decorative-grid`, `async-content` | Container patterns |
| `tippy-popover` | Tippy.js wrapper |
| `sidebar/` | 5-part sidebar component system |

All components built on **Radix UI** primitives with **class-variance-authority** for variant styling and **tailwind-merge** for class composition.

---

*End of Low Level Design Document*
