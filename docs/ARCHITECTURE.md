# BecomeAnAuthor Architecture

## Overview

A **desktop-only** novel-writing app using **Next.js** + **Tauri** (Rust).

| Principle | Implementation |
|-----------|----------------|
| Desktop-only | All data on local filesystem |
| Clean Architecture | 4 layers: Presentation → Application → Domain → Infrastructure |
| Repository Pattern | Interface-based data access |
| Feature Modules | UI organized by domain feature |

---

## Folder Structure

```
becomeAnAuthor/
│
├── frontend/                        # REACT/NEXT.JS
│   ├── app/                         # Next.js pages
│   │   ├── page.tsx                 # Home (project list)
│   │   └── project/page.tsx         # Main workspace
│   │
│   ├── components/ui/               # Shared UI primitives
│   │
│   ├── features/                    # Feature modules
│   │   ├── editor/                  # Scene editor (TipTap)
│   │   ├── codex/                   # Encyclopedia
│   │   ├── chat/                    # AI assistant
│   │   ├── plan/                    # Structure planning
│   │   ├── snippets/                # Text fragments
│   │   └── settings/                # Configuration
│   │
│   ├── domain/                      # Interfaces & types
│   │   ├── entities/types.ts
│   │   ├── repositories/            # 11 interface files
│   │   └── services/
│   │
│   ├── infrastructure/              # Implementations
│   │   ├── di/AppContext.tsx        # DI container
│   │   ├── repositories/            # 11 Tauri*Repository files
│   │   └── services/                # ChatService, etc.
│   │
│   ├── hooks/                       # React hooks
│   ├── lib/                         # Utilities
│   │   ├── core/ai-client.ts
│   │   └── tauri/commands.ts
│   └── store/                       # Zustand stores
│
├── backend/                         # RUST/TAURI
│   ├── src/lib.rs                   # 50+ Tauri commands
│   ├── Cargo.toml
│   └── tauri.conf.json
│
└── docs/                            # Documentation
```

---

## Data Flow

```
Component → Hook → AppContext → TauriRepository → Rust Command → Filesystem
```

---

## 11 Repositories

| Repository | Storage |
|------------|---------|
| TauriNodeRepository | `structure.json` + `manuscript/*.md` |
| TauriProjectRepository | `project.json` |
| TauriCodexRepository | `codex/{category}/*.json` |
| TauriSnippetRepository | `snippets/*.json` |
| TauriChatRepository | `.meta/chat/threads/*.json` |
| TauriAnalysisRepository | `.meta/analyses.json` |
| TauriCodexRelationRepository | `.meta/codex_relations.json` |
| TauriCodexTagRepository | `.meta/codex_tags.json` |
| TauriCodexTemplateRepository | `.meta/codex_templates.json` |
| TauriCodexRelationTypeRepository | `.meta/codex_relation_types.json` |
| TauriSceneCodexLinkRepository | `.meta/scene_codex_links.json` |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js, React, TypeScript |
| Desktop | Tauri 2 (Rust) |
| Editor | TipTap |
| Styling | Tailwind CSS |
| State | Zustand |
