# Feature Modules

Feature-based organization in `frontend/features/`.

## Structure

Each feature follows:
```
frontend/features/{feature}/
├── components/       # React components
├── hooks/           # Feature-specific hooks
└── types.ts         # Types (optional)
```

## Features

| Feature | Purpose | Key Components |
|---------|---------|----------------|
| `editor/` | Scene writing with TipTap | SceneEditor, EditorToolbar, WordCount |
| `codex/` | Character/location encyclopedia | CodexPanel, EntryDetail, RelationGraph |
| `chat/` | AI assistant | ChatPanel, MessageList, ContextSelector |
| `plan/` | Manuscript structure | PlanView, ActList, DragDrop |
| `snippets/` | Reusable text | SnippetList, SnippetCard |
| `review/` | Story analysis | AnalysisPanel, InsightCards |
| `settings/` | Configuration | SettingsPanel |

## Component Hierarchy

```
frontend/
├── app/page.tsx              # Routes
├── features/{feature}/       # Domain modules
├── components/ui/            # Shared primitives
└── hooks/                    # Shared hooks
```

## Dependency Flow

```
Pages → Features → Hooks → AppContext → Repositories
```
