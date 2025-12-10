# Frontend Architecture

## System Name
**Become An Author - React/Next.js Frontend**

---

## Technology Stack

### **Core Technologies**
- **Framework**: Next.js 16.0.3 (App Router, Static Export)
- **Language**: TypeScript 5 (Strict Mode)
- **UI Library**: React 19.2.0
- **Routing**: Next.js App Router (file-based routing)
- **State Management**: Zustand 5.0 (with persist middleware)
- **Styling**: Tailwind CSS 4
- **Build Tool**: Next.js (Turbopack)

### **Key Frontend Dependencies**

| Dependency | Version | Purpose |
|-----------|---------|---------|
| **UI Components** |
| `@radix-ui/*` | 1.x - 2.x | Headless UI primitives (dialog, popover, select, etc.) |
| `shadcn/ui` | - | Styled Radix components (prebuilt, customizable) |
| `lucide-react` | 0.554 | Icon library (2000+ icons) |
| `next-themes` | 0.4.6 | Dark mode support |
| **Rich Text Editor** |
| `@tiptap/react` | 3.11 | Headless editor framework |
| `@tiptap/starter-kit` | 3.11 | Prebuilt Tiptap extensions |
| `@tiptap/extension-*` | 3.11 | Character count, mentions, placeholder, typography |
| **State & Data** |
| `zustand` | 5.0 | Lightweight state management |
| `react-hook-form` | 7.68 | Form state management |
| `zod` | 4.1 | Schema validation |
| **AI Integration** |
| `ai` | 5.0 | Vercel AI SDK (streaming, completions) |
| `@dqbd/tiktoken` | 1.0 | Token counting for AI |
| **Drag & Drop** |
| `@dnd-kit/*` | 6.x - 10.x | Accessible drag-and-drop (core, sortable, utilities) |
| **Export** |
| `docx` | 9.5 | DOCX file generation |
| `react-markdown` | 10.1 | Markdown rendering |
| **Search** |
| `fuse.js` | 7.1 | Fuzzy search |
| `cmdk` | 1.1 | Command palette (Cmd+K) |
| **UI Utilities** |
| `react-resizable-panels` | 3.0 | Resizable layout panels |
| `react-hot-toast` | 2.6 | Toast notifications |
| `sonner` | 2.0 | Toast notifications (alternative) |
| **Desktop Integration** |
| `@tauri-apps/api` | 2.9 | Tauri IPC client |
| **Testing** | | |
| `vitest` | 4.0 | Unit test framework |
| `@testing-library/react` | 16.3 | React testing utilities |
| `happy-dom` / `jsdom` | - | DOM environment for tests |
| `fake-indexeddb` | 6.2 | Mock IndexedDB for tests |

### **Build Configuration**
- **Output Mode**: Static export (`output: 'export'`)
- **Image Optimization**: Disabled (Tauri compatibility)
- **Trailing Slash**: Enabled (for `file://` URLs)
- **PostCSS**: Tailwind CSS v4
- **TypeScript**: Strict mode, target ES2020

---

## Folder Structure & Roles

### **Project Structure Overview**

```
/app                        # Next.js App Router pages
/frontend                   # Frontend source code
  ├── components/           # Shared UI components
  ├── core/                 # Core utilities (API, tauri, storage)
  ├── domain/               # Domain layer (entities, interfaces)
  ├── features/             # Feature-sliced modules (15 features)
  ├── hooks/                # Reusable React hooks (36+ hooks)
  ├── infrastructure/       # Implementation layer (repositories, services)
  ├── lib/                  # Shared libraries (integrations, utils)
  ├── shared/               # Cross-feature shared code
  ├── store/                # Zustand stores
  └── test/                 # Test utilities
```

### **Detailed Module Breakdown**

#### **`/app` - Next.js Pages** (4 routes + layouts)

| Path | Component | Responsibility |
|------|-----------|---------------|
| `/` | `page.tsx` | **Dashboard** - Project list |
| `/project/[id]` | `client.tsx` | **Workspace Main** - Editor/plan/chat/review modes |
| `/project/[id]/layout.tsx` | Layout wrapper | Top navigation, project context |
| `/(workspace)/review` | `page.tsx` | **Story Analysis** - Standalone review page |
| `/auth/callback` | `page.tsx` | **Google OAuth Callback** - Handle OAuth redirect |
| `/not-found.tsx` | 404 page | Not found handler |
| `/layout.tsx` | Root layout | Theme provider, app context, error boundary |

**Key Pattern**: App Router uses file-based routing. `[id]` = dynamic route.

#### **`/frontend/components` - Shared UI Components**

| Module | Responsibility | Key Components |
|--------|---------------|---------------|
| **`ui/`** | Shadcn/UI primitives (26 components) | Button, Dialog, Input, Select, Tabs, Tooltip, etc. |
| **`data-management/`** | Import/export UI | DataManagementMenu, ExportProjectButton |
| **Root components** | App-level utilities | ErrorBoundary, ThemeProvider, ClientToaster, AppCleanup, MultiTabWarning |

#### **`/frontend/core` - Core Infrastructure**

| Module | Responsibility | Technologies |
|--------|---------------|-------------|
| **`api/`** | AI service clients | Gemini, OpenAI, streaming utilities |
| **`config/`** | Configuration management | - |
| **`storage/`** | Safe storage abstraction | LocalStorage wrapper with type safety |
| **`tauri/`** | Tauri IPC commands | Wrapper for backend commands |
| **`logger.ts`** | Application logging | Console logging with levels |
| **`tab-coordinator.ts`** | Multi-tab coordination | BroadcastChannel for tab awareness |

#### **`/frontend/domain` - Domain Layer (DDD-inspired)**

| Module | Responsibility | Count |
|--------|---------------|-------|
| **`entities/types.ts`** | All domain entities | 20+ TypeScript interfaces |
| **`repositories/`** | Repository interfaces | 12 interfaces (INodeRepository, ICodexRepository, etc.) |
| **`services/`** | Business logic interfaces | IChatService, IExportService, IAnalysisService, NodeDeletionService |

**Design Pattern**: **Hexagonal Architecture**  
- Domain = pure TypeScript interfaces (no implementation)
- Infrastructure = Tauri-based implementations

#### **`/frontend/features` - Feature Modules** (15 domains)

Each feature follows **Feature-Sliced Design**:
```
features/<feature>/
  ├── components/     # UI components for this feature
  ├── hooks/          # Feature-specific hooks (optional)
  └── index.ts        # Public API
```

| Feature | Responsibility | Key Components |
|---------|---------------|----------------|
| **`ai`** | AI model selection, prompt config | AIModelSelector, PromptEditor |
| **`chat`** | AI chat interface | ChatInterface, ChatThreadList, MessageList |
| **`codex`** | World-building DB (characters, locations, lore) | CodexEntryEditor, RelationGraph, TagManager, TemplateEditor |
| **`dashboard`** | Project list, project cards | DashboardHeader, ProjectGrid, EmptyState |
| **`data-management`** | Import/export workflows | - (uses components in `/components`) |
| **`editor`** | Scene editor (Tiptap) | EditorContainer, TiptapEditor, StoryTimeline, BubbleMenu, SlashCommands |
| **`google-drive`** | Google Drive backup sync | GoogleDriveSettings, BackupScheduler |
| **`navigation`** | App-wide navigation | ProjectNavigation (sidebar) |
| **`plan`** | Manuscript structure tree | PlanView, ActNode, ChapterNode, SceneNode (drag-and-drop) |
| **`project`** | Project CRUD, metadata | CreateProjectDialog, ProjectSettings |
| **`review`** | Story analysis dashboard | ReviewDashboard, TimelineView, ContradictionDetector |
| **`search`** | Full-text search (Cmd+K) | SearchPalette, SearchResults |
| **`settings`** | App settings (AI keys, preferences) | SettingsDialog, ModelSettings, StorageSettings |
| **`shared`** | Cross-feature UI components | ThemeProvider, ErrorBoundary |
| **`snippets`** | Reusable text snippets | SnippetEditor, SnippetList |

#### **`/frontend/hooks` - Custom React Hooks** (36+ hooks)

| Category | Hooks | Purpose |
|----------|-------|---------|
| **Repository Hooks** | `useRepository`, `useNodeRepository`, `useCodexRepository`, etc. | Access DI container repositories |
| **Service Hooks** | `useChatService`, `useExportService`, `useDocumentExport` | Access DI container services |
| **UI Hooks** | `useDialogState`, `useConfirmation`, `useErrorHandler`, `useMobile` | UI state management |
| **Data Hooks** | `useLiveQuery`, `useAutoSave`, `useDebounce` | Data fetching and persistence |
| **Feature Hooks** | `useContextAssembly`, `usePrompt`, `useAI` | Domain-specific logic |
| **Integration Hooks** | `useGoogleAuth`, `useGoogleDrive`, `useStorageQuota`, `useTabLeader` | External integrations |

**Key Hook: `useLiveQuery`**
- Custom implementation (no Dexie dependency)
- Auto-refetches on data mutations
- Global `invalidateQueries()` for manual refresh

#### **`/frontend/infrastructure` - Implementation Layer**

| Module | Responsibility | Count |
|--------|---------------|-------|
| **`di/AppContext.tsx`** | **Dependency Injection** container | React Context provider for all repositories/services |
| **`repositories/`** | **Tauri implementations** | 12 repositories (TauriNodeRepository, TauriCodexRepository, etc.) |
| **`services/`** | **Service implementations** | ChatService, DocumentExportService, AnalysisService |

**Pattern**: Repository Pattern + Dependency Injection
- All components consume interfaces (domain layer)
- Implementations injected via React Context
- Testable (can inject mock repositories)

#### **`/frontend/lib` - Shared Libraries**

| Module | Responsibility | Technologies |
|--------|---------------|-------------|
| **`config/`** | AI vendor config, model specs | Constants for Gemini, OpenAI, Claude |
| **`core/`** | AI client, save coordinator | Streaming AI, debounced saves |
| **`integrations/`** | External services | Google Auth (PKCE), Google Drive, AI rate limiter |
| **`prompts/`** | AI prompt templates | Analysis prompts (synopsis, contradictions, etc.) |
| **`services/`** | Utility services | Token counter, search service, trash service |
| **`tiptap-extensions/`** | Custom Tiptap plugins | Section node, slash commands |
| **`utils/`** | Editor utilities | - |
| **`search-service.ts`** | Full-text search (Fuse.js) | - |

#### **`/frontend/shared` - Cross-Feature Shared Code**

| Module | Responsibility | Contents |
|--------|---------------|----------|
| **`constants/`** | App-wide constants | - |
| **`prompts/`** | Prompt templates | Analysis prompts, templates |
| **`schemas/`** | Zod validation schemas | Import schema validation |
| **`seed-data/`** | Built-in templates | Codex templates, relation types |
| **`types/`** | Shared type definitions | - |
| **`utils/`** | Shared utilities | AI utils, context assembler, token counter, type guards |
| **`validations.ts`** | Zod schemas | - |

#### **`/frontend/store` - Zustand Stores**

| Store | Responsibility | Persistence |
|-------|---------------|------------|
| **`use-project-store.ts`** | Active project, scene, view mode | Partial (showSidebar, showTimeline) |
| **`use-chat-store.ts`** | Chat UI state | No |
| **`use-format-store.ts`** | Text formatting state, focus mode | No |
| **`editor-ui-store.ts`** | Editor UI state (panel visibility) | No |

**Key Pattern**: **Local-first state**
- Zustand for ephemeral UI state
- Tauri IPC for persistent data (via repositories)
- `useLiveQuery` for reactive data from Tauri

---

## Frontend Implementation Details

### **1. Editor Components** (`features/editor/components/` - 16 files)

**Core Editor**:
- `EditorContainer.tsx` (338 lines) - Main editor wrapper with 3 layouts (desktop/mobile/focus)
- `tiptap-editor.tsx` - Tiptap integration, extensions, placeholder
- `story-timeline.tsx` - Right panel showing word count, character appearances

**Editor Menus**:
- `text-selection-menu.tsx` - **Bubble menu** (appears on text selection)
  - Format: Bold, italic, underline, strikethrough
  - Alignment: Left, center, right
  - Lists: Bullet, numbered
  - AI actions: Rewrite, continue, expand
  
- `format-menu.tsx` - Floating format toolbar
- `rewrite-menu.tsx` - AI rewrite options (improve, simplify, expand)
- `continue-writing-menu.tsx` - AI continuation suggestions
- `text-replace-dialog.tsx` - Find/replace modal

**Slash Commands** (`section-component.tsx`):
- `/section` - Insert story section (chapter break, time skip, POV change)
- `/character` - Mention character from codex
- `/location` - Mention location from codex
- Custom sections with formatting

**Advanced Features**:
- `mention-list.tsx` - Autocomplete for `@mentions` (characters, locations)
- `tinker-mode.tsx` - Experimental AI writing assistant
- `tweak-generate-dialog.tsx` - AI text generation modal
- `FocusModeToggle.tsx` - Distraction-free writing toggle (Cmd+Shift+F)

**Scene Actions**:
- `scene-action-menu.tsx` - Scene metadata editor
- `NodeActionsMenu.tsx` - Rename, delete, duplicate scene
- `editor-toolbar.tsx` - Top toolbar with formatting buttons

**Key Patterns**:
- **Tiptap Extensions**: Custom nodes for sections, mentions
- **AI Integration**: Streaming responses from AI SDK
- **Debounced Auto-save**: 500ms debounce via `SaveCoordinator`
- **Emergency Backup**: 10-second interval backup to Tauri

---

### **2. Plan View Layouts** (`features/plan/components/` - 9 files)

**Main Container**: `plan-view.tsx` (152 lines)
- View switcher: Grid | Outline | Matrix | Timeline
- Search bar with fuzzy search
- Codex filter bar (filter scenes by character/location)

**Four Layout Modes**:

#### **Grid View** (`grid-view.tsx`)
- **Visual**: Card-based drag-and-drop
- **Structure**: Acts → Chapters → Scenes (nested cards)
- **Features**:
  - Drag to reorder within same parent
  - Scene cards show word count, status badge
  - Color-coded by status (draft/revised/final)
  - Click to edit scene

#### **Outline View** (`outline-view.tsx`)
- **Visual**: Hierarchical tree list
- **Structure**: Collapsible tree (like file explorer)
- **Features**:
  - Expand/collapse acts and chapters
  - Inline word count totals per chapter/act
  - Quick actions: Rename, delete, add child
  - Keyboard navigation (arrow keys)

#### **Matrix View** (`matrix-view.tsx`)
- **Visual**: Spreadsheet-style table
- **Columns**: Scene | Word Count | Status | POV | Codex Links
- **Features**:
  - Sortable columns
  - Filter by status, POV character
  - Shows codex badges (character mentions)
  - Bulk actions (multi-select scenes)

#### **Timeline View** (`timeline-view.tsx`)
- **Visual**: Horizontal timeline with milestones
- **Structure**: Linear chronological view
- **Features**:
  - Word count progression chart
  - Character appearance markers
  - Scene duration estimates
  - Zoom in/out timeline

**Supporting Components**:
- `scene-card.tsx` - Draggable scene card component
- `scene-codex-badges.tsx` - Shows character/location chips
- `scene-link-panel.tsx` - Manage scene-codex links
- `codex-filter-bar.tsx` - Multi-select filter (filter scenes by codex entry)

**Key Features**:
- **Drag-and-Drop**: `@dnd-kit` for reordering
- **Real-time Sync**: `useLiveQuery` updates on structure changes
- **Codex Integration**: Links scenes to characters/locations
- **Search**: FuseJS fuzzy search across scenes and codex

---

### **3. Codex Tab Structure** (`features/codex/components/` - 12 files)

**Main Editor**: `entity-editor.tsx` + `entity-editor/` subfolder
- **Header**: `EntityEditorHeader.tsx` - Name, category dropdown, delete button
- **Info Card**: `EntityEditorInfoCard.tsx` - Summary card with thumbnail
- **Tab Container**: Tab-based interface (5 tabs)

**Tab Components**:

#### **Details Tab** (`details-tab.tsx`)
- **Fields**: Name, aliases, description
- **Custom Fields**: Template-based fields (age, occupation, etc.)
- **Template Selector**: Apply predefined templates
- **Image Upload**: Thumbnail + full image
- **Gallery**: Multiple images

#### **Relations Tab** (`relations-tab.tsx`)
- **Visual**: Network graph of relationships
- **Features**:
  - Add relationship ( entry → relation type → target entry)
  - Bidirectional links (ally ↔ enemy)
  - Strength slider (1-10)
  - Color-coded by relation type
- **Library**: Force-directed graph (D3.js or similar)

#### **Mentions Tab** (`mentions-tab.tsx`)
- **Purpose**: Show which scenes mention this entry
- **Display**: List of scenes with excerpt
- **Features**:
  - Click to open scene in editor
  - Shows role (appears | mentioned | POV)
  - Auto-detected mentions highlighted
  - Manual link management

#### **Research Tab** (`research-tab.tsx`)
- **Purpose**: External links and notes
- **Fields**: External URLs, research notes, references
- **Features**:
  - Link preview cards
  - Notes with markdown
  - File attachments (future)

#### **Tracking Tab** (`tracking-tab.tsx`)
- **Purpose**: Meta-settings for this entry
- **Options**:
  - `Track Mentions` - Auto-detect in scenes
  - `Show in Timeline` - Appear in story timeline
  - `Global Entry` - Available across all projects in series
  - `Do Not Track` - Exclude from auto-detection
- **Completeness**: Progress bar (% of required fields filled)

**Supporting Components**:
- `codex-list.tsx` - Sidebar list with category filters
- `tag-manager.tsx` - Create/assign tags to entries
- `template-selector.tsx` - Apply pre-made templates (character, location, etc.)
- `template-field-renderer.tsx` - Render custom fields based on template

**Key Features**:
- **Templates**: Reusable field sets (built-in + custom)
- **Tags**: Multi-tag support with color coding
- **Search**: Fast filter across 500+ entries
- **Validation**: Required fields indicator

---

### **4. Review Feature Hooks** (`features/review/hooks/` - 5 hooks)

**Purpose**: AI-powered story analysis and review

#### **Hooks Breakdown**:

1. **`use-analysis-repository.ts`**
   - Access to `IAnalysisRepository`
   - CRUD for saving/loading analysis results

2. **`use-analysis-runner.ts`** (60+ lines)
   - **Core hook** for running AI analysis
   - **Inputs**: Selected scenes, analysis type
   - **Analysis Types**:
     - `synopsis` - Generate story summary
     - `contradictions` - Find plot holes
     - `character-arcs` - Analyze character development
     - `pacing` - Detect pacing issues
     - `themes` - Extract themes and motifs
   - **Process**:
     1. Assemble context (selected scenes + codex)
     2. Build prompt from template
     3. Stream AI response (Gemini/Claude/GPT)
     4. Parse structured response (JSON)
     5. Save to `.meta/analyses/`
   - **Features**:
     - Progress tracking (% of scenes analyzed)
     - Cancellation support
     - Error recovery

3. **`use-analysis-delete.ts`**
   - Delete analysis with confirmation
   - Clears from repository

4. **`use-manuscript-nodes.ts`**
   - Fetch manuscript structure for scene selection
   - Filter by acts/chapters
   - Tree traversal utility

5. **`use-manuscript-version.ts`**
   - **Purpose**: Detect if manuscript changed since analysis
   - **Implementation**:
     - Calculate hash of manuscript structure + content
     - Compare against hash stored in analysis
     - Show "outdated" warning if mismatch
   - **UI**: `VersionWarning.tsx` component

**Review Dashboard Components**:
- `ReviewDashboard.tsx` - Main analysis view
- `AnalysisRunDialog.tsx` - Configure and run new analysis
- `AnalysisDetailDialog.tsx` - View analysis results
- `ManuscriptTreeSelector.tsx` - Select scenes for analysis

---

### **5. Additional Component Details**

**Search Feature** (`features/search/components/` - 5 files):
- `SearchPalette.tsx` - Cmd+K command palette
- `SearchInput.tsx` - Autocomplete input
- `SearchResults.tsx` - Results list with categories
- `SearchResultItem.tsx` - Individual result card
- `SearchEmptyState.tsx` - No results state

**Features**:
- Fuzzy search (FuseJS)
- Categories: Scenes, Codex, Snippets, Commands
- Keyboard navigation (arrow keys, Enter)
- Recent searches

**Chat Feature** (`features/chat/components/` - 11 files):
- `chat-interface.tsx` - Main chat UI
- `chat-thread.tsx` - Thread sidebar
- `chat-message-list.tsx` - Message history
- `chat-input.tsx` - Message composer
- `AIChat.tsx` - AI chat with context assembly
- `ai-chat-controls.tsx` - Model selector, tokens display
- `prompt-selector.tsx` - Select pre-made prompts

**Key Features**:
- Streaming responses (AI SDK)
- Context assembly (scenes + codex)
- Token counting (tiktoken)
- Thread pinning/archiving
- Model switching (Gemini/GPT/Claude)

**Dashboard** (`features/dashboard/components/` - 4 files):
- `DashboardHeader.tsx` - Welcome banner, create project button
- `ProjectGrid.tsx` - Grid of project cards
- `ProjectCard.tsx` - Project thumbnail, word count, last modified
- `EmptyState.tsx` - No projects state

**Google Drive** (`features/google-drive/components/` + `hooks/` - 4 files):
- `InlineGoogleAuth.tsx` - OAuth flow initiation
- `DriveBackupBrowser.tsx` - Browse/restore backups from Drive
- `use-google-auth.ts` - OAuth token management (PKCE flow)
- `use-google-drive.ts` - Upload/download backups

---

## Routing Structure

### **Next.js App Router Routes**

| Route | Page Component | Responsibility | View Mode |
|-------|--------------|---------------|-----------|
| `/` | `app/page.tsx` | **Dashboard** - List all projects | - |
| `/project/[id]` | `app/project/[id]/client.tsx` | **Workspace** - Main editor workspace | `plan`, `write`, `chat`, `review` |
| `/(workspace)/review` | `app/(workspace)/review/page.tsx` | **Story Analysis** (standalone) | - |
| `/auth/callback` | `app/auth/callback/page.tsx` | **OAuth Callback** - Google Auth redirect | - |

### **View Modes (within `/project/[id]`)**

The workspace uses **4 view modes** controlled by `useProjectStore().viewMode`:

```tsx
const { viewMode } = useProjectStore();

if (viewMode === 'plan') return <PlanView />;
if (viewMode === 'write') return <EditorContainer />;
if (viewMode === 'chat') return <ChatInterface />;
if (viewMode === 'review') return <ReviewDashboard />;
```

| View Mode | Component | Description |
|-----------|-----------|-------------|
| `plan` | `<PlanView>` | Manuscript tree (acts → chapters → scenes), drag-and-drop reordering |
| `write` | `<EditorContainer>` | Scene editor (Tiptap), sidebar navigation, timeline, snippets panel |
| `chat` | `<ChatInterface>` | AI chat with context assembly (threads, messages, model selector) |
| `review` | `<ReviewDashboard>` | Story analysis (timeline, contradictions, character arcs) |

### **Navigation Between Views**

- **Top Navigation Bar** (`ProjectNavigation`) - Tabs for Plan/Write/Chat/Review
- **Keyboard Shortcuts**:
  - `Cmd+K` / `Ctrl+K` → Search palette
  - `Cmd+Shift+F` → Toggle focus mode (write view only)
  - `Esc` → Exit focus mode

---

## Data Flow

### **State Management Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT COMPONENTS                         │
│  (EditorContainer, PlanView, ChatInterface, etc.)           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├── Zustand Stores (UI State)
                   │   ├── useProjectStore (viewMode, activeSceneId)
                   │   ├── useFormatStore (focusMode, textFormatting)
                   │   └── useChatStore (chat UI state)
                   │
                   ├── useLiveQuery (Reactive Data Fetching)
                   │   └── invalidateQueries() on mutations
                   │
                   └── AppContext (Dependency Injection)
                       ├── Repositories (INodeRepository, etc.)
                       │   └── TauriNodeRepository → Tauri IPC → Rust Backend
                       └── Services (IChatService, etc.)
                           └── ChatService → Use multiple repositories
```

### **Where State Lives**

| State Type | Storage Location | Persistence | Example |
|-----------|-----------------|------------|---------|
| **UI State** | Zustand stores | None / LocalStorage | `viewMode`, `focusMode`, `showSidebar` |
| **Form State** | `react-hook-form` | None | Scene content (before save) |
| **Server State** | `useLiveQuery` + Repositories | Tauri filesystem | Projects, scenes, codex entries |
| **Google Auth** | LocalStorage | Yes | OAuth tokens, user info |
| **Emergency Backups** | Tauri backend | Yes (temporary) | Scene crash recovery |

### **How API Calls Happen**

**Pattern**: Repository Pattern via Dependency Injection

1. **Component imports hook**:
   ```tsx
   const nodeRepo = useRepository<INodeRepository>('nodeRepository');
   ```

2. **Hook accesses AppContext** (DI container):
   ```tsx
   const { nodeRepository } = useAppServices();
   ```

3. **Repository implementation** (TauriNodeRepository):
   ```ts
   async get(id: string): Promise<Scene> {
     return await invoke('load_scene', { sceneId: id });
   }
   ```

4. **Tauri IPC call** to Rust backend:
   ```
   Frontend → IPC → Rust → Filesystem → JSON file → Return
   ```

5. **Reactive updates** via `useLiveQuery`:
   ```tsx
   const scene = useLiveQuery(
     () => nodeRepo.get(sceneId),
     [sceneId, nodeRepo]
   );
   ```

### **Data Flow Example: Save Scene**

```
User types in TiptapEditor
  ↓
onChange event → local state update
  ↓
useDebounce (500ms) →
  ↓
SaveCoordinator.scheduleSave(sceneId, saveFn)
  ↓
nodeRepo.update(sceneId, content)
  ↓
TauriNodeRepository.update()
  ↓
invoke('save_scene', { sceneId, content })
  ↓
Rust: save_scene command
  ↓
Write to: project_path/manuscript/<sceneId>.md
  ↓
invalidateQueries() // Trigger all useLiveQuery to refetch
  ↓
Components auto-update
```

**Key Pattern**: **Optimistic UI + Debounced Saves**
- Immediate UI feedback
- Debounced writes (500ms - 2000ms)
- `SaveCoordinator` prevents race conditions

---

## UI/UX Architecture

### **Design System**

**Foundation**: **Shadcn/UI** + **Tailwind CSS**

- **Components**: Radix UI headless primitives + custom styling
- **Colors**: CSS variables (theme-aware)
- **Typography**: Google Fonts (Inter, Outfit)
- **Dark Mode**: `next-themes` (system/light/dark)
- **Icons**: Lucide React (2000+ icons)
- **Spacing**: Tailwind scale (rem-based)

### **Key Design Patterns**

#### **1. Compound Components**

```tsx
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogDescription>Content</DialogDescription>
  </DialogContent>
</Dialog>
```

**Used in**: All modals, popovers, dropdowns

#### **2. Headless UI + Styling**

- **Radix UI**: Accessibility, keyboard navigation, focus management
- **Tailwind CSS**: Visual styling
- **CVA (Class Variance Authority)**: Component variants

```tsx
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "bg-primary",
      destructive: "bg-destructive",
    },
  },
});
```

#### **3. Responsive Layout**

- **Desktop**: `ResizablePanelGroup` (3-column: sidebar | editor | timeline)
- **Mobile**: `Sheet` components (slide-out panels)
- **Hook**: `useIsMobile()` to switch layouts

```tsx
if (isMobile) {
  return <Sheet><SheetContent side="left">...</SheetContent></Sheet>;
}
return <ResizablePanelGroup>...</ResizablePanelGroup>;
```

#### **4. Focus Mode**

Full-screen distraction-free writing:
- No sidebar, no timeline
- Centered editor (max-width: 3xl)
- Minimal header (word count + exit button)
- Keyboard shortcut: `Cmd+Shift+F`

#### **5. Command Palette** (Cmd+K)

- **Library**: `cmdk`
- **Search**: Scenes, codex entries, snippets
- **Fuzzy search**: Fuse.js
- **Navigate**: Jump to any content

### **Component Hierarchy Example**

```
EditorContainer
├── ProjectNavigation (sidebar)
│   ├── PlanTree
│   │   └── SceneNode (drag-and-drop)
│   ├── CodexList
│   └── SnippetList
├── TiptapEditor (main editor)
│   ├── BubbleMenu (text formatting)
│   ├── SlashCommands (/commands)
│   └── MentionSuggestion (@mentions)
└── StoryTimeline (right panel)
    ├── WordCountChart
    ├── CharacterAppearances
    └── SceneList
```

### **UI State Patterns**

| Pattern | Implementation | Example |
|---------|---------------|---------|
| **Loading States** | `useLiveQuery` returns `undefined` | `if (!data) return <Skeleton />` |
| **Error States** | `ErrorBoundary` + `useErrorHandler` | Catch errors, show toast |
| **Optimistic Updates** | Update UI immediately, rollback on error | Scene title edit |
| **Debounced Saves** | `useDebounce` + `SaveCoordinator` | Autosave after typing |
| **Confirmation Dialogs** | `useConfirmation` hook | Delete project confirmation |

---

## Interactions with Backend

### **Communication Protocol**

**Tauri IPC (Inter-Process Communication)**
- **Frontend**: `@tauri-apps/api.invoke()`
- **Backend**: Rust `#[tauri::command]` functions
- **Format**: JSON serialization (Serde)

### **Repository Pattern**

All backend interactions go through **repository interfaces**:

```typescript
interface INodeRepository {
  get(id: string): Promise<Scene>;
  getAll(projectId: string): Promise<DocumentNode[]>;
  create(node: DocumentNode): Promise<DocumentNode>;
  update(id: string, updates: Partial<Scene>): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### **Tauri Command Examples**

```typescript
// Load scene
const scene = await invoke<Scene>('load_scene', {
  projectPath: '/path/to/project',
  sceneId: 'scene-123'
});

// Save scene
await invoke('save_scene', {
  projectPath: '/path/to/project',
  scene: { id, title, content, ... }
});

// List codex entries
const entries = await invoke<CodexEntry[]>('list_codex_entries', {
  projectPath: '/path/to/project'
});
```

### **Error Handling**

```typescript
try {
  await nodeRepo.update(sceneId, updates);
} catch (error) {
  console.error('Save failed:', error);
  toast.error('Failed to save scene');
  // Optionally: Rollback optimistic update
}
```

### **Data Synchronization**

**No real-time sync** (desktop app, single instance):
- **Multi-tab coordination**: `BroadcastChannel` for tab awareness
- **Multi-tab warning**: Prevent concurrent edits
- **Tab leader election**: One tab owns project at a time

---

## Performance & Quality Considerations

### **Performance Optimizations**

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| **Lazy Loading** | Next.js dynamic imports | Reduce initial bundle size |
| **Code Splitting** | Feature-sliced modules | Load features on-demand |
| **Debouncing** | `useDebounce` for saves (500ms - 2s) | Reduce IPC calls |
| **Memoization** | `useMemo`, `useCallback` | Prevent unnecessary re-renders |
| **Virtual Scrolling** | Not implemented (low priority) | Would help with 1000+ scenes |
| **Lazy Repository Initialization** | Proxy pattern in AppContext | Faster startup |
| **Optimistic UI** | Update UI before backend confirms | Feels instant |

### **Bundle Size**

- **Total**: ~2.5MB (gzipped)
- **Next.js**: 300KB
- **React**: 150KB
- **Tiptap**: 400KB (largest dependency)
- **Radix UI**: 200KB
- **Tailwind CSS**: 50KB (purged)

**Strategy**: Static export → Single HTML + JS bundle

### **Code Quality**

| Aspect | Tooling | Enforcement |
|--------|---------|------------|
| **Type Safety** | TypeScript strict mode | Compile-time errors |
| **Linting** | ESLint (Next.js config) | Pre-commit hook (Husky) |
| **Formatting** | Prettier | Automated (lint-staged) |
| **Testing** | Vitest + Testing Library | 30%+ coverage (goal: 70%) |
| **Architecture** | `eslint-plugin-boundaries` | Enforce feature boundaries |
| **Dependencies** | `dependency-cruiser` | Detect circular dependencies |

### **Testing Strategy**

```
frontend/
├── hooks/__tests__/
│   ├── use-live-query.test.ts
│   ├── use-debounce.test.ts
│   └── use-dialog-state.test.ts
├── lib/__tests__/
│   └── ai-utils.test.ts
└── test/
    ├── setup.ts (Vitest config)
    └── test-utils.tsx (render helpers)
```

**Coverage Areas**:
- ✅ Hooks (data fetching, debounce, UI state)
- ✅ Utilities (AI utils, token counting)
- ❌ Components (low coverage - manual testing preferred)
- ❌ Integration tests (not implemented)

### **Accessibility**

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Keyboard Navigation** | Radix UI (built-in) |  ✅ |
| **Focus Management** | Dialog, popover auto-focus | ✅ |
| **ARIA Labels** | Partial implementation | 🔶 |
| **Screen Reader** | Not extensively tested | ❌ |
| **Color Contrast** | WCAG AA compliance | ✅ |
| **Semantic HTML** | Proper heading hierarchy | ✅ |

### **Error Handling**

1. **Component Level**: `ErrorBoundary` catches React errors
2. **Hook Level**: `useErrorHandler` provides error state
3. **Repository Level**: `.catch()` on Tauri IPC calls
4. **User Feedback**: Toast notifications (`react-hot-toast`)
5. **Logging**: Console logs (no analytics)

### **Security**

| Concern | Mitigation | Notes |
|---------|-----------|-------|
| **XSS** | React auto-escaping, Tiptap sanitization | ✅ |
| **Path Traversal** | Backend validation (Rust) | ✅ |
| **API Keys** | LocalStorage (encrypted by OS) | 🔶 Not encrypted in localStorage |
| **OAuth Tokens** | PKCE flow, refresh tokens | ✅ |
| **File System Access** | Tauri scoped paths | ✅ |

---

## Key Architectural Decisions

### **1. Why Feature-Sliced Design?**
- **Scalability**: Easy to add new features
- **Maintainability**: Clear boundaries between features
- **Team Collaboration**: Features are self-contained
- **Testing**: Test features in isolation

### **2. Why Dependency Injection (React Context)?**
- **Testability**: Inject mock repositories
- **Flexibility**: Swap implementations (Tauri → IndexedDB → API)
- **Consistency**: Single source of truth for services
- **Type Safety**: Interfaces enforce contracts

### **3. Why Repository Pattern?**
- **Abstraction**: Hide backend details from UI
- **Swappable Storage**: Could switch from Tauri to API
- **Consistent API**: All data access through repositories
- **Easier Mocking**: Test components without backend

### **4. Why No Redux?**
- **Zustand is simpler**: Less boilerplate
- **Local-first**: Most state is in Tauri backend
- **Ephemeral UI State**: Doesn't need Redux complexity
- **Performance**: Zustand is faster for small apps

### **5. Why Tiptap over Draft.js / Slate?**
- **Modern**: Built on ProseMirror (battle-tested)
- **Headless**: Full control over UI
- **Extensible**: Custom nodes, marks, extensions
- **TypeScript**: Full type safety
- **Ecosystem**: Rich extension marketplace

### **6. Why Static Export?**
- **Desktop App**: No server needed
- **Performance**: Pre-rendered HTML
- **Tauri Compatibility**: `file://` protocol
- **Simplicity**: No SSR complexity

---

## Future Improvements

### **Performance**
1. **Virtual Scrolling** for 1000+ scenes in tree view
2. **Web Workers** for AI token counting (off main thread)
3. **IndexedDB Caching** for faster initial load
4. **Bundle Splitting** per view mode (plan/write/chat/review)

### **Features**
5. **Collaboration** (multi-user editing) - conflicts with local-first
6. **Mobile App** (React Native wrapper for Tauri)
7. **Browser Extension** (Grammarly-like writing assistant)
8. **Plugin System** (third-party extensions)

### **Quality**
9. **E2E Tests** (Playwright for Tauri)
10. **Storybook** for component documentation
11. **Visual Regression** tests (Percy, Chromatic)
12. **Performance Monitoring** (Lighthouse CI)

### **UX**
13. **Undo/Redo** history (scene-level, not just editor)
14. **Version Control** (Git-like branching for scenes)
15. **Voice Dictation** (Web Speech API)
16. **AI Auto-complete** (inline suggestions as you type)

---

## Summary

**Become An Author** uses a **modern, scalable frontend architecture** with:

### **Strengths**
- ✅ **Type-safe** (TypeScript strict mode)
- ✅ **Modular** (Feature-sliced design)
- ✅ **Testable** (Dependency injection, repository pattern)
- ✅ **Performant** (Static export, debounced saves)
- ✅ **Accessible** (Radix UI, keyboard navigation)
- ✅ **Beautiful** (Shadcn/UI, dark mode, responsive)

### **Architecture Patterns**
- **Hexagonal Architecture** (domain/infrastructure separation)
- **Repository Pattern** (abstract data access)
- **Dependency Injection** (React Context)
- **Feature-Sliced Design** (vertical slice by feature)
- **Command Pattern** (Tauri IPC commands)

### **Trade-offs**
- **Local-first** → No real-time collaboration
- **Desktop-only** → No web browser version
- **Static export** → No SSR (but faster for desktop)
- **Tauri IPC** → No offline mode (requires Rust backend)

### **Ideal For**
- Solo novelists
- Desktop-native experience
- Privacy-conscious users
- Offline-first writing (no cloud required)
