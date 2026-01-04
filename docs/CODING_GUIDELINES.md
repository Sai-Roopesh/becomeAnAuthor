# Coding Guidelines

Best practices and conventions for the Become An Author codebase.

> **Last Updated**: January 3, 2026

---

## Architecture Overview

### The 8-Layer Architecture

This project uses an enterprise-style layered architecture:

```
1. UI Component          → React component (features/)
2. Custom Hook           → Business logic (hooks/)
3. Zustand Store         → State management (store/)
4. Repository Interface  → Abstraction (domain/repositories/)
5. Tauri Repository      → Implementation (infrastructure/repositories/)
6. Commands Wrapper      → Type-safe invoke (core/tauri/commands.ts)
7. Tauri IPC             → Bridge (@tauri-apps/api)
8. Rust Command          → File I/O (backend/src/commands/)
```

### When to Follow vs Skip Layers

> [!TIP]
> **The full 8 layers are overkill for simple features.** Use your judgment.

| Scenario | Recommended Approach |
|----------|----------------------|
| **New entity type** (Scene, Codex, etc.) | Full architecture |
| **Simple UI feature** | Skip repository interface |
| **One-off command** | Direct invoke from hook |
| **Bug fix** | Minimal changes needed |

**Pragmatic shortcuts for simple features:**
```typescript
// Simple feature: Direct invoke from hook
const useSimpleFeature = () => {
    const doThing = async () => {
        await invoke('simple_command', { projectPath, data });
    };
    return { doThing };
};
```

---

## Mandatory: Adding a New Field to Existing Entity

> [!IMPORTANT]
> To add a new field to `Scene`, `Project`, `Codex`, etc., update ALL of these:

| Step | File | Purpose |
|------|------|---------|
| 1 | `frontend/domain/entities/types.ts` | TypeScript interface |
| 2 | `backend/src/models/{entity}.rs` | Rust struct |
| 3 | `frontend/infrastructure/repositories/Tauri{Entity}Repository.ts` | Transformation |
| 4 | `frontend/core/tauri/commands.ts` | Wrapper types |
| 5 | Consuming hooks/components | Update usage |

---

## Critical: TauriNodeRepository Singleton

> [!CAUTION]
> **ALWAYS use `TauriNodeRepository.getInstance()`** — never `new TauriNodeRepository()`.

All repositories depend on `TauriNodeRepository.getInstance().getProjectPath()`.

```typescript
// ✅ CORRECT
const nodeRepo = TauriNodeRepository.getInstance();

// ❌ WRONG - Creates orphan without projectPath
const nodeRepo = new TauriNodeRepository();
```

---

## Tauri IPC Conventions

### Parameter Naming (Tauri 2.0 Auto-Conversion)

> [!TIP]
> Tauri 2.0 auto-converts Rust `snake_case` → JavaScript `camelCase`

**Rust command:**
```rust
#[tauri::command]
pub fn save_scene_by_id(project_path: String, scene_id: String) -> ...
```

**TypeScript invoke:**
```typescript
// ✅ CORRECT - camelCase
await invoke('save_scene_by_id', { projectPath, sceneId });

// ❌ WRONG - snake_case fails
await invoke('save_scene_by_id', { project_path, scene_id });
```

### Timestamp Handling

Timestamps use RFC3339 strings in files, i64 milliseconds in IPC:

**Rust model:**
```rust
use crate::utils::timestamp;

#[derive(Serialize, Deserialize)]
pub struct SceneMeta {
    #[serde(
        serialize_with = "timestamp::serialize_as_rfc3339",
        deserialize_with = "timestamp::deserialize_from_rfc3339"
    )]
    pub created_at: i64,
    #[serde(
        serialize_with = "timestamp::serialize_as_rfc3339",
        deserialize_with = "timestamp::deserialize_from_rfc3339"
    )]
    pub updated_at: i64,
}
```

**Creating timestamps:**
```rust
use crate::utils::timestamp;

let now = timestamp::now_millis();  // i64 milliseconds
let now_str = timestamp::to_rfc3339(now);  // For YAML frontmatter
```

---

## Code Quality

### Toast Notifications

> [!IMPORTANT]
> **Always use the toast-service wrapper**, not direct sonner imports.

```typescript
// ✅ CORRECT - Use toast-service wrapper
import { toast } from '@/shared/utils/toast-service';

toast.success('Project saved');
toast.error('Failed to load', { description: 'Check network connection' });

// ❌ WRONG - Direct sonner import (only for infrastructure files)
import { toast } from 'sonner';
```

**Why?** The `toast-service` wrapper:
- Provides consistent default durations (4s success, 5s error)
- Normalizes the API across the app
- Allows future changes in one place

**Exceptions** (may use direct sonner):
- `core/toast.ts` - Core layer wrapper
- `shared/utils/toast-service.ts` - The wrapper itself
- `components/toast-provider.tsx` - Toaster initialization

### Cross-Feature Imports

> [!CAUTION]
> **Features should NOT directly import from other features.** Use composition patterns.

```typescript
// ❌ WRONG - Direct cross-feature import
import { CreateProjectDialog } from '@/features/project';
import { ExportProjectButton } from '@/features/data-management';

// ✅ CORRECT - Accept as props (slots pattern)
interface EmptyStateProps {
    createProjectSlot?: React.ReactNode;
    restoreProjectSlot?: React.ReactNode;
}

// ✅ CORRECT - Accept as render prop
interface ProjectCardProps {
    renderExportButton?: (projectId: string) => React.ReactNode;
}

// Parent (app layer) composes features:
<EmptyState
    createProjectSlot={<CreateProjectDialog />}
    restoreProjectSlot={<RestoreProjectDialog />}
/>
```

**Why?** Feature-Sliced Design principles:
- Features remain independent and testable
- No circular dependencies
- Clear composition at app layer

### Logging

```typescript
import { logger } from '@/shared/utils/logger';

const log = logger.scope('MyComponent');
log.debug('Dev-only message');
log.info('User action');
log.error('Failure', err);
```

### Type Safety

- Use `unknown` instead of `any`
- Import types from `@/domain/entities/types`
- Use Tiptap types from `@/shared/types/tiptap`

### Rust Code Quality

- **No `.unwrap()`** — use `?` or `.ok_or_else()`
- **No `console.warn` stubs** — implement or document why not
- Use `.map_err(|e| e.to_string())` for error conversion

---

## File Organization

```
frontend/
├── domain/              # Pure types/interfaces
│   ├── entities/        # Types (types.ts)
│   └── repositories/    # I*Repository interfaces
├── infrastructure/      # Implementations
│   ├── repositories/    # Tauri*Repository classes
│   └── services/        # Business services
├── features/            # Feature modules (FSD)
├── hooks/               # Reusable React hooks
├── core/                # Logger, API, storage
├── shared/              # Utilities, prompts
│   └── utils/           # logger, context-engine, etc.
└── lib/config/          # Constants, AI vendors

backend/src/
├── commands/            # Tauri commands
├── models/              # Data structures
├── utils/               # Helpers (timestamp, validation)
└── lib.rs               # Command registration
```

---

## Testing

> [!IMPORTANT]
> **Follow TDD for new features.** See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for complete details.

### Test Organization

```
feature/
└── __tests__/           ← Tests go in __tests__ subfolder
    ├── feature.test.ts  ← Unit tests
    ├── fixtures/        ← Test data
    └── mocks/           ← Module mocks
```

### Test Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode (TDD)  
npm run test:coverage # Coverage report
cd backend && cargo test  # Rust tests
```

### TDD Workflow

1. **RED**: Write failing test first
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Clean up without breaking tests

### Priority Testing Targets

| Layer | Priority | Coverage Goal |
|-------|----------|---------------|
| Repositories | Critical | 90% |
| Hooks | High | 70% |
| Services | High | 80% |
| Components | Medium | 50% |

---

## Key Constants

Import from `@/lib/config/constants`:

```typescript
import { 
    AUTO_SAVE_DEBOUNCE_MS,
    MAX_CONTEXT_TOKENS,
    EMERGENCY_BACKUP_EXPIRY_MS 
} from '@/lib/config/constants';
```

---

## UI/CSS: Responsive Design Guidelines

> [!IMPORTANT]
> **Zero hardcoded pixel values.** Use flexbox, grid, viewport units, and relative sizing.

### Core Principles

1. **Mobile-First Approach**: Design for mobile, enhance for desktop
2. **Flexible Layouts**: Use flexbox and grid instead of fixed dimensions
3. **Viewport-Relative Units**: Prefer `vh`, `vw`, `dvh` over pixel values
4. **Intrinsic Sizing**: Let content determine size when possible
5. **Touch-Friendly**: Minimum 44×44px touch targets

### Responsive Patterns Reference

| Need | Pattern | Example |
|------|---------|---------|
| Full viewport height | `h-dvh` or `h-screen` | Main app container |
| Full height child | `flex-1 min-h-0` | Scrollable content area |
| Dialog max height | `max-h-[85dvh]` | Settings dialog |
| Scrollable content | `flex-1 min-h-0 overflow-y-auto` | Timeline lanes |
| Flexible sidebar | `flex-shrink-0 min-w-48 max-w-64` | Navigation panel |
| Responsive grid | `grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]` | Card grid |
| Touch target | `min-h-11 min-w-11` | Mobile buttons (44px) |
| Breakpoint widths | `sm:`, `md:`, `lg:`, `xl:` | Tailwind responsive |

### Flexbox Guidelines

```tsx
// ✅ CORRECT - Flexible container with scrollable content
<div className="flex flex-col h-dvh">
  <header className="flex-shrink-0">Header</header>
  <main className="flex-1 min-h-0 overflow-y-auto">
    {/* Content scrolls within available space */}
  </main>
</div>

// ❌ WRONG - Fixed pixel heights
<div style={{ height: '800px' }}>
  <header style={{ height: '80px' }}>Header</header>
  <main style={{ height: '720px', overflow: 'auto' }}>
    {/* Breaks on different screen sizes */}
  </main>
</div>
```

**Key Flexbox Patterns:**
- Use `flex-1` to fill available space
- Use `min-h-0` or `min-w-0` to enable scrolling in flex children
- Use `flex-shrink-0` for fixed-size items (headers, sidebars)
- Combine `gap-*` instead of manual margins

### CSS Grid Guidelines

```tsx
// ✅ CORRECT - Responsive grid
<div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// ✅ CORRECT - Timeline grid with dynamic columns
<div 
  className="grid gap-2" 
  style={{ gridTemplateColumns: `repeat(${sceneCount}, minmax(120px, 1fr))` }}
>
  {scenes.map(scene => <SceneCell key={scene.id} />)}
</div>

// ❌ WRONG - Fixed pixel widths
<div style={{ display: 'grid', gridTemplateColumns: '200px 200px 200px' }}>
  {/* Doesn't adapt to screen size */}
</div>
```

**Key Grid Patterns:**
- Use `auto-fill` or `auto-fit` for responsive columns
- Use `minmax(min, max)` for flexible sizing
- Use `gap-*` for consistent spacing
- Use `grid-template-areas` for complex layouts

### Viewport Units

```tsx
// ✅ CORRECT - Viewport-relative heights
<Dialog className="max-h-[85dvh] overflow-hidden">
  <DialogContent className="flex-1 min-h-0 overflow-y-auto">
    {/* Content scrolls within dialog */}
  </DialogContent>
</Dialog>

// ✅ CORRECT - Responsive text input
<Textarea className="max-h-[25vh] resize-none" />

// ❌ WRONG - Fixed pixel heights
<Dialog style={{ maxHeight: '600px' }}>
  {/* Breaks on small screens */}
</Dialog>
```

**Viewport Unit Reference:**
- `vh` / `vw`: Standard viewport units
- `dvh` / `dvw`: **Preferred** - Dynamic viewport (accounts for mobile browser chrome)
- `svh` / `svw`: Small viewport (smallest size when browser chrome is visible)
- `lvh` / `lvw`: Large viewport (largest size when browser chrome is hidden)

**When to use:**
- Dialogs/Modals: `max-h-[85dvh]`
- Scrollable areas: `max-h-[60vh]` to `max-h-[80vh]`
- Text inputs: `max-h-[20vh]` to `max-h-[30vh]`
- Full-screen layouts: `h-dvh` or `h-screen`

### Avoiding Hardcoded Pixels

> [!CAUTION]
> Hardcoded pixel values (`w-[300px]`, `h-[600px]`) break responsive design.

**Exceptions** (when pixels are acceptable):
1. **Icon sizes**: `h-4 w-4`, `h-6 w-6` (Tailwind tokens)
2. **User-defined colors**: `backgroundColor: userColor` (dynamic)
3. **Border widths**: `border`, `border-2` (design system)
4. **Small fixed elements**: Avatar sizes, badges

```tsx
// ✅ ACCEPTABLE - Tailwind design tokens
<Icon className="h-5 w-5" />
<Avatar className="h-10 w-10" />

// ✅ ACCEPTABLE - Relative units
<Sidebar className="w-64 max-w-[20vw]" />
<Card className="max-w-md" />

// ❌ AVOID - Arbitrary pixel values
<div className="w-[427px] h-[683px]" />
<div style={{ width: '300px', height: '500px' }} />
```

### Mobile Responsiveness

```tsx
// ✅ CORRECT - Mobile-first responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// ✅ CORRECT - Stacking on mobile
<div className="flex flex-col md:flex-row gap-4">
  <Sidebar className="w-full md:w-64" />
  <Main className="flex-1" />
</div>

// ✅ CORRECT - Touch-friendly buttons
<Button className="min-h-11 min-w-11 p-3">
  {/* 44px minimum touch target */}
</Button>
```

**Mobile Breakpoints (Tailwind):**
- `sm:`: 640px
- `md:`: 768px
- `lg:`: 1024px
- `xl:`: 1280px
- `2xl:`: 1536px

### Dialog & Modal Guidelines

All dialogs/modals should:
1. Use `dvh` units for max height (not fixed pixels)
2. Implement proper scrolling with `flex-1 min-h-0 overflow-y-auto`
3. Support mobile with horizontal tabs or stacked layouts
4. Never exceed viewport bounds

```tsx
// ✅ CORRECT - Responsive dialog
<DialogContent className="flex flex-col h-[85dvh] max-h-[85dvh]">
  <DialogHeader className="flex-shrink-0">
    <DialogTitle>Settings</DialogTitle>
  </DialogHeader>
  
  {/* Mobile: horizontal scroll tabs */}
  <div className="flex overflow-x-auto gap-2 md:flex-col md:overflow-visible">
    <TabButton>General</TabButton>
    <TabButton>AI</TabButton>
  </div>
  
  {/* Content area with proper scrolling */}
  <div className="flex-1 min-h-0 overflow-y-auto p-6">
    {content}
  </div>
</DialogContent>

// ❌ WRONG - Fixed height dialog
<DialogContent style={{ height: '700px', width: '800px' }}>
  {/* Breaks on mobile */}
</DialogContent>
```

### Z-Index Management

Use semantic z-index CSS variables (defined in `globals.css`):

```tsx
// ✅ CORRECT - Semantic z-index
<Modal className="z-50">           {/* Tailwind standard modal */}
<Tooltip className="z-50">        {/* Tailwind standard tooltip */}
<Sheet className="z-50">          {/* Tailwind standard sheet */}

// ❌ AVOID - Arbitrary z-index values
<div className="z-[999]" />
<div className="z-[100]" />
```

**Semantic Scale** (from `globals.css`):
- `--z-dropdown: 1000`
- `--z-sticky: 1020`
- `--z-fixed: 1030`
- `--z-modal-backdrop: 1040`
- `--z-modal: 1050`
- `--z-popover: 1060`
- `--z-toast: 1070`
- `--z-tooltip: 1080`

### Testing Responsive Layouts

**Required Test Viewports:**
- Mobile: 375×667 (iPhone SE)
- Tablet: 768×1024 (iPad)
- Desktop: 1920×1080 (Standard monitor)

**Checklist:**
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] Dialogs fit within viewport
- [ ] Content scrolls properly (no nested scroll)
- [ ] Text remains readable (min 14px / 0.875rem)

---

## Recent Changes (December 2025)

### Series-First Architecture (December 23, 2025)

> [!IMPORTANT]
> **Every project MUST belong to a series.** No standalone projects are allowed.

**Core Principle:**
```
User → Creates Series → Creates Projects inside Series → Codex shared across all projects
```

**Key Changes:**

| Area | Before | After |
|------|--------|-------|
| Project.seriesId | Optional | **REQUIRED** |
| Project.seriesIndex | Optional | **REQUIRED** (e.g., "Book 1") |
| Codex storage | Per-project | **Per-series** (`~/.BecomeAnAuthor/series/{id}/codex/`) |
| `ICodexRepository.get()` | `(entryId)` | `(seriesId, entryId)` |
| `ICodexRepository.getByProject()` | `(projectId)` | **REMOVED** → Use `getBySeries(seriesId)` |

**CreateProjectDialog Pattern:**

```tsx
// ✅ CORRECT - Series is REQUIRED
const seriesRepo = useSeriesRepository();
const existingSeries = useLiveQuery(() => seriesRepo.list(), [seriesRepo]);

// Validation - block creation without series
if (!formData.seriesId) {
    toast.error('Please select a series. Every book must belong to a series.');
    return;
}

// Create project with required fields
await projectRepo.create({
    title,
    author,
    seriesId: formData.seriesId,       // REQUIRED
    seriesIndex: formData.seriesIndex, // REQUIRED (e.g., "Book 1")
    customPath,
});
```

**Codex Repository Pattern:**

```tsx
// ❌ WRONG - Old pattern (deprecated)
const entries = await codexRepo.getByProject(projectId);

// ✅ CORRECT - Series-first pattern
const entries = await codexRepo.getBySeries(project.seriesId);

// ❌ WRONG - Single-arg get (deprecated)
const entry = await codexRepo.get(entryId);

// ✅ CORRECT - Two-arg get
const entry = await codexRepo.get(seriesId, entryId);
```

**Component Props Pattern:**

When components need codex access, pass `seriesId` as a prop:

```tsx
// ✅ CORRECT - Pass seriesId through component hierarchy
<EditorContainer project={project} />
  ↳ <DesktopLayout seriesId={project.seriesId} />
    ↳ <ChatThread threadId={threadId} />  // Uses useAI for streaming
      ↳ <ContextSelector seriesId={seriesId} projectId={projectId} />
```

### Timestamps (IPC Type Fix)
- `SceneMeta` and `ProjectMeta` now use `i64` internally
- Files stay human-readable (RFC3339 strings)
- Use `utils/timestamp.rs` helpers

### Analysis Features
- Timeline Analysis: ✅ Enabled
- Contradiction Detection: ✅ Enabled

### Removed Dead Code
- `ensure_default_series` references removed from migration hook
- `updateMessage()` documented as intentional no-op
