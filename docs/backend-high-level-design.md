# Backend High-Level Design

> [!IMPORTANT]
> **Comprehensive architectural documentation for the Rust/Tauri backend.**  
> Last updated: 2026-01-03

---

## Executive Summary

This document provides an exhaustive analysis of the backend architecture for the "Become An Author" application—a **Rust-based Tauri backend** providing secure, local-first file system operations for a writing studio.

### Key Statistics
- **18 Command Modules** (105 commands total)
- **11 Data Model Files** (25+ structs)
- **7 Utility Modules** (validation, security, I/O, timestamp)
- **1 Main Binary** (`lib.rs` + `main.rs`)
- **355 Lines** of validation code
- **191 Lines** of security code

### Architecture Philosophy
The backend follows **Filesystem-First Design** principles:
1. **No Database** — All data stored in files (JSON + Markdown)
2. **Human-Readable** — Files can be edited manually
3. **Git-Friendly** — Plain text enables version control
4. **Secure by Default** — OS-level keychain for secrets

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Command Modules](#3-command-modules)
4. [Data Models](#4-data-models)
5. [File System Design](#5-file-system-design)
6. [Security Architecture](#6-security-architecture)
7. [Validation Layer](#7-validation-layer)
8. [Error Handling](#8-error-handling)
9. [Design Decisions](#9-design-decisions)

---

## 1. Architecture Overview

### 1.1 Layered Architecture

```mermaid
graph TB
    subgraph "Presentation Layer (Frontend)"
        Frontend[TypeScript/React]
    end
    
    subgraph "IPC Layer"
        Tauri[Tauri Runtime]
        Commands[Command Handlers]
    end
    
    subgraph "Business Logic Layer"
        ProjectCmds[Project Commands]
        SceneCmds[Scene Commands]
        CodexCmds[Codex Commands]
        ChatCmds[Chat Commands]
        BackupCmds[Backup Commands]
        TrashCmds[Trash Commands]
        SecurityCmds[Security Commands]
    end
    
    subgraph "Validation Layer"
        PathValidation[Path Validation]
        InputValidation[Input Validation]
        SizeValidation[Size Validation]
    end
    
    subgraph "Data Access Layer"
        FileIO[File I/O Utils]
        JSONSerde[JSON Serialization]
        MarkdownParsing[Markdown Parsing]
    end
    
    subgraph "Security Layer"
        Keychain[OS Keychain]
        PathSecurity[Path Security]
    end
    
    subgraph "Storage Layer"
        FileSystem[Local File System]
        ProjectFiles[Project Files]
        MetaFiles[Metadata Files]
    end
    
    Frontend -->|invoke()| Tauri
    Tauri --> Commands
    Commands --> ProjectCmds
    Commands --> SceneCmds
    Commands --> CodexCmds
    Commands --> ChatCmds
    Commands --> BackupCmds
    Commands --> TrashCmds
    Commands --> SecurityCmds
    
    ProjectCmds --> PathValidation
    SceneCmds --> InputValidation
    CodexCmds --> SizeValidation
    
    ProjectCmds --> FileIO
    SceneCmds --> FileIO
    CodexCmds --> FileIO
    
    FileIO --> JSONSerde
    FileIO --> MarkdownParsing
    
    SecurityCmds --> Keychain
    FileIO --> PathSecurity
    
    FileIO --> FileSystem
    JSONSerde --> ProjectFiles
    MarkdownParsing --> MetaFiles
    
    style PathValidation fill:#fff3e0
    style InputValidation fill:#fff3e0
    style SizeValidation fill:#fff3e0
    style Keychain fill:#e8f5e9
    style PathSecurity fill:#e8f5e9
```

### 1.2 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Language** | Rust 1.70+ | Type safety, memory safety, performance |
| **Framework** | Tauri 2.0 | Cross-platform desktop framework |
| **Serialization** | Serde | JSON ↔ Rust struct conversion |
| **Security** | keyring crate | OS-level secret storage |
| **Logging** | log crate | Structured logging |
| **File I/O** | std::fs | Standard library file operations |
| **Path Handling** | std::path | Path manipulation and validation |

---

## 2. Directory Structure

### 2.1 Complete Backend Layout

```
backend/
├── src/
│   ├── main.rs                    # Binary entry point (4 lines)
│   ├── lib.rs                     # Library + command registration (176 lines)
│   │
│   ├── commands/                  # Command modules (18 modules, 105 commands)
│   │   ├── mod.rs                 # Module declarations
│   │   ├── project.rs             # Project CRUD (19KB, 15 commands)
│   │   ├── scene.rs               # Scene CRUD (7.4KB, 4 commands)
│   │   ├── codex.rs               # Codex CRUD (12KB, 21 commands)
│   │   ├── chat.rs                # Chat threads/messages (5.4KB, 8 commands)
│   │   ├── analysis.rs            # AI analysis storage (1.7KB, 3 commands)
│   │   ├── snippet.rs             # Text snippets (1.7KB, 3 commands)
│   │   ├── backup.rs              # Backup + Export (23KB, 11 commands)
│   │   ├── search.rs              # Full-text search (2.1KB, 1 command)
│   │   ├── trash.rs               # Soft delete (5.4KB, 5 commands)
│   │   ├── series.rs              # Multi-book series (9KB, 13 commands)
│   │   ├── seed.rs                # Default templates (4.2KB, 1 command)
│   │   ├── security.rs            # API key storage (5.9KB, 4 commands)
│   │   ├── idea.rs                # Brainstorming (2KB, 4 commands)
│   │   ├── mention.rs             # Cross-references (8.6KB, 2 commands)
│   │   ├── collaboration.rs       # Yjs state (2.1KB, 4 commands)
│   │   ├── scene_note.rs          # Scene annotations (1.5KB, 3 commands)
│   │   ├── world_map.rs           # Story maps (2.8KB, 4 commands)
│   │   └── world_timeline.rs      # Timeline events (1.7KB, 3 commands)
│   │
│   ├── models/                    # Data models (11 files, 25+ structs)
│   │   ├── mod.rs                 # Module exports
│   │   ├── project.rs             # ProjectMeta, StructureNode, Series
│   │   ├── scene.rs               # SceneMeta
│   │   ├── codex.rs               # CodexEntry, CodexRelation, etc.
│   │   ├── chat.rs                # ChatThread, ChatMessage
│   │   ├── snippet.rs             # Snippet
│   │   ├── analysis.rs            # StoryAnalysis
│   │   ├── idea.rs                # Idea
│   │   ├── scene_note.rs          # SceneNote
│   │   ├── world_map.rs           # WorldMap, MapMarker
│   │   └── world_timeline.rs      # WorldEvent
│   │
│   └── utils/                     # Utility modules (7 modules)
│       ├── mod.rs                 # Module exports
│       ├── paths.rs               # Path resolution (1.8KB)
│       ├── validation.rs          # Input validation (11.2KB, 355 lines)
│       ├── security.rs            # Path security (2.1KB)
│       ├── io.rs                  # File I/O helpers
│       ├── text.rs                # Text processing
│       └── timestamp.rs           # Timestamp utilities (1.2KB)
│
├── Cargo.toml                     # Dependencies
├── tauri.conf.json                # Tauri configuration
├── build.rs                       # Build script
└── tests/
    └── security_tests.rs          # Security integration tests
```

### 2.2 Command Module Organization

```rust
// commands/mod.rs
pub mod project;
pub mod scene;
pub mod codex;
pub mod chat;
pub mod snippet;
pub mod analysis;
pub mod backup;
pub mod search;
pub mod trash;
pub mod series;
pub mod seed;
pub mod security;
pub mod mention;
pub mod collaboration;
pub mod idea;
pub mod scene_note;
pub mod world_map;
pub mod world_timeline;
```

**Pattern**: Each module exports `#[tauri::command]` functions that are registered in `lib.rs`.

---

## 3. Command Modules

### 3.1 Command Inventory (67 Total)

#### Project Commands (11 commands)

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `get_projects_path` | Get projects directory | None | `String` (path) |
| `list_projects` | List all projects | None | `Vec<ProjectMeta>` |
| `create_project` | Create new project | `title`, `author` | `ProjectMeta` |
| `delete_project` | Delete project | `project_path` | `()` |
| `update_project` | Update metadata | `project_path`, `updates` | `ProjectMeta` |
| `archive_project` | Archive/unarchive | `project_path`, `archived` | `()` |
| `get_structure` | Get project structure | `project_path` | `Vec<StructureNode>` |
| `save_structure` | Save structure | `project_path`, `structure` | `()` |
| `create_node` | Create act/chapter/scene | `project_path`, `node_type`, `title`, `parent_id` | `StructureNode` |
| ~~`rename_node`~~ | ❌ Unused | - | - |
| ~~`delete_node`~~ | ❌ Unused | - | - |

#### Scene Commands (4 commands)

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `load_scene` | Load scene content | `project_path`, `scene_file` | `Scene` |
| `save_scene` | Save scene | `project_path`, `scene_file`, `content`, `title?` | `SceneMeta` |
| ~~`save_scene_by_id`~~ | ❌ Unused (replaced by save coordinator) | - | - |
| `delete_scene` | Delete scene file | `project_path`, `scene_file` | `()` |

#### Codex Commands (21 commands)

**Entries (4)**:
- `list_codex_entries` → `Vec<CodexEntry>`
- `save_codex_entry` → `CodexEntry`
- `delete_codex_entry` → `()`
- `get_codex_entry` → `CodexEntry`

**Relations (3)**:
- `list_codex_relations` → `Vec<CodexRelation>`
- `save_codex_relation` → `CodexRelation`
- `delete_codex_relation` → `()`

**Tags (5)**:
- `list_codex_tags` → `Vec<CodexTag>`
- `create_codex_tag` → `CodexTag`
- `update_codex_tag` → `CodexTag`
- `delete_codex_tag` → `()`
- `add_entry_tag`, `remove_entry_tag` → `()`

**Templates (4)**:
- `list_codex_templates` → `Vec<CodexTemplate>`
- `create_codex_template` → `CodexTemplate`
- `update_codex_template` → `CodexTemplate`
- `delete_codex_template` → `()`

**Relation Types (3)**:
- `list_relation_types` → `Vec<CodexRelationType>`
- `create_relation_type` → `CodexRelationType`
- `delete_relation_type` → `()`

**Scene-Codex Links (2)**:
- `list_scene_codex_links` → `Vec<SceneCodexLink>`
- `save_scene_codex_link` → `SceneCodexLink`

#### Chat Commands (7 commands)

| Command | Purpose |
|---------|---------|
| `list_chat_threads` | Get all threads for project |
| `create_chat_thread` | Create new thread |
| `update_chat_thread` | Update thread metadata |
| `delete_chat_thread` | Delete thread + messages |
| `list_chat_messages` | Get messages for thread |
| `save_chat_message` | Save new message |
| `delete_chat_message` | Delete message |

#### Analysis Commands (3 commands)

| Command | Purpose |
|---------|---------|
| `list_story_analyses` | Get all analysis results |
| `save_story_analysis` | Save analysis result |
| `delete_story_analysis` | Delete analysis |

#### Snippet Commands (3 commands)

| Command | Purpose |
|---------|---------|
| `list_snippets` | Get all snippets for project |
| `save_snippet` | Create/update snippet |
| `delete_snippet` | Delete snippet |

#### Backup Commands (4 commands)

| Command | Purpose |
|---------|---------|
| `save_emergency_backup` | Save scene backup (emergency) |
| `get_emergency_backup` | Retrieve backup |
| `delete_emergency_backup` | Delete backup |
| `cleanup_emergency_backups` | Delete expired backups |

#### Export/Import Commands (3 commands)

| Command | Purpose |
|---------|---------|
| `export_manuscript_text` | Export full manuscript as plain text |
| `export_project_backup` | Export project to JSON |
| `import_project_backup` | Import project from JSON |

#### Search Command (1 command)

| Command | Purpose |
|---------|---------|
| `search_project` | Full-text search across scenes and codex |

#### Trash Commands (5 commands)

| Command | Purpose |
|---------|---------|
| `move_to_trash` | Soft-delete (preserves metadata) |
| `restore_from_trash` | Restore deleted item |
| `list_trash` | List trashed items |
| `permanent_delete` | Permanently delete from trash |
| `empty_trash` | Delete all trash items |

#### Series Commands (13 commands)

| Command | Purpose |
|---------|---------|
| `list_series` | Get all series |
| `create_series` | Create new series |
| `update_series` | Update series |
| `delete_series` | Delete series |
| `delete_series_cascade` | Delete series with all projects |
| `list_series_codex_entries` | List codex entries for series |
| `get_series_codex_entry` | Get single series codex entry |
| `save_series_codex_entry` | Save series codex entry |
| `delete_series_codex_entry` | Delete series codex entry |
| `list_series_codex_relations` | List series codex relations |
| `save_series_codex_relation` | Save series relation |
| `delete_series_codex_relation` | Delete series relation |
| `migrate_codex_to_series` | Migrate project codex to series |

#### Security Commands (4 commands)

| Command | Purpose |
|---------|---------|
| `store_api_key` | Store API key in OS Keychain |
| `get_api_key` | Retrieve API key from Keychain |
| `delete_api_key` | Delete API key from Keychain |
| `list_api_key_providers` | List providers with stored keys |

#### Idea Commands (4 commands)

| Command | Purpose |
|---------|---------|
| `list_ideas` | Get all ideas for project |
| `create_idea` | Create new idea |
| `update_idea` | Update idea |
| `delete_idea` | Delete idea |

#### Mention Commands (2 commands)

| Command | Purpose |
|---------|---------|
| `find_mentions` | Find all mentions of a codex entry |
| `count_mentions` | Count mentions across project |

#### Collaboration Commands (4 commands)

| Command | Purpose |
|---------|---------|
| `save_yjs_state` | Save Yjs CRDT state |
| `load_yjs_state` | Load Yjs state |
| `has_yjs_state` | Check if Yjs state exists |
| `delete_yjs_state` | Delete Yjs state |

#### Scene Note Commands (3 commands)

| Command | Purpose |
|---------|---------|
| `get_scene_note` | Get note for scene |
| `save_scene_note` | Save scene note |
| `delete_scene_note` | Delete scene note |

#### World Map Commands (4 commands)

| Command | Purpose |
|---------|---------|
| `list_maps` | List all maps |
| `save_map` | Save map data |
| `delete_map` | Delete map |
| `upload_map_image` | Upload map image |

#### World Timeline Commands (3 commands)

| Command | Purpose |
|---------|---------|
| `list_world_events` | List timeline events |
| `save_world_event` | Save timeline event |
| `delete_world_event` | Delete timeline event |

---

## 4. Data Models

### 4.1 Core Rust Structs

#### ProjectMeta

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectMeta {
    pub id: String,
    pub title: String,
    pub author: String,
    pub description: String,
    pub path: String,              // Relative path (e.g., "my-novel")
    #[serde(default)]
    pub archived: bool,
    pub created_at: String,        // RFC3339 timestamp
    pub updated_at: String,        // RFC3339 timestamp
}
```

**Storage**: `~/BecomeAnAuthor/Projects/<project-path>/.meta/project.json`

---

#### StructureNode

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StructureNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,         // "act" | "chapter" | "scene"
    pub title: String,
    pub order: i32,
    #[serde(default)]
    pub children: Vec<StructureNode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,      // Only for scenes: "scene-123.md"
}
```

**Storage**: `~/BecomeAnAuthor/Projects/<project-path>/.meta/structure.json`

**Pattern**: Hierarchical tree structure (Acts → Chapters → Scenes)

---

#### SceneMeta

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SceneMeta {
    pub id: String,
    pub title: String,
    pub order: i32,
    pub status: String,            // "draft" | "revised" | "final"
    pub word_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pov_character: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

**Storage**: Part of scene file frontmatter (Markdown + YAML)

---

#### CodexEntry

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexEntry {
    pub id: String,
    pub name: String,
    pub category: String,          // "character" | "location" | "item" | "lore" | "subplot"
    pub description: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub attributes: HashMap<String, String>,
    pub created_at: i64,           // Unix timestamp (milliseconds)
    pub updated_at: i64,
}
```

**Storage**: 
- **Series-first (NEW)**: `~/BecomeAnAuthor/series/<series-id>/codex/<category>/<id>.json`
- **Legacy (deprecated)**: `~/BecomeAnAuthor/Projects/<project-path>/.meta/codex/<category>/<id>.json`

> [!NOTE]
> **Series-First Architecture**: Codex entries are now stored at the **series level**, not the project level.
> This allows characters, locations, and lore to be shared across all books in a series.

---

#### ChatThread & ChatMessage

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatThread {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub pinned: bool,
    pub archived: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub id: String,
    pub thread_id: String,
    pub role: String,              // "user" | "assistant"
    pub content: String,
    pub timestamp: i64,
}
```

**Storage**: 
- Threads: `~/BecomeAnAuthor/Projects/<project-path>/.meta/chat/threads.json`
- Messages: `~/BecomeAnAuthor/Projects/<project-path>/.meta/chat/messages.json`

---

### 4.2 Serde Patterns

**1. Rename Fields** (camelCase ↔ snake_case):

```rust
#[derive(Serialize, Deserialize)]
pub struct Series {
    pub id: String,
    pub title: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,           // JSON: "createdAt", Rust: created_at
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}
```

**2. Default Values**:

```rust
#[derive(Serialize, Deserialize)]
pub struct ProjectMeta {
    #[serde(default)]
    pub archived: bool,            // Defaults to false if missing
}
```

**3. Skip Serialization**:

```rust
#[derive(Serialize, Deserialize)]
pub struct StructureNode {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,      // Omit field if None
}
```

---

## 5. File System Design

### 5.1 Project Directory Structure

```
~/BecomeAnAuthor/
├── series/                          # ✅ NEW: Series-first architecture
│   └── <series-id>/
│       └── codex/                   # Shared codex for all books in series
│           ├── character/
│           ├── location/
│           ├── item/
│           ├── lore/
│           └── subplot/
│
├── Projects/
│   └── <project-name>/              # User's project
│       ├── scenes/                  # Scene content files
│       │   ├── act-1-chapter-1-scene-1.md
│       │   ├── act-1-chapter-1-scene-2.md
│       │   └── ...
│       │
│       └── .meta/                   # Metadata (hidden directory)
│           ├── project.json         # Project metadata (includes seriesId)
│           ├── structure.json       # Project structure tree
│           │
│           ├── chat/                # AI chat history
│           │   ├── threads.json
│           │   └── messages.json
│           │
│           ├── snippets/            # Text templates
│           │   └── snippets.json
│           │
│           ├── analysis/            # AI analysis results
│           │   └── analyses.json
│           │
│           ├── trash/               # Soft-deleted items
│           │   ├── scenes/
│           │   ├── codex/
│           │   └── trash-index.json
│           │
│           └── templates/           # Codex templates
│               └── templates.json
│
└── .meta/                           # Global metadata
    ├── series.json                  # Multi-book series
    └── project_registry.json        # All projects index
```

### 5.2 File Formats

#### Scene File (`scenes/*.md`)

**Format**: Markdown with YAML frontmatter + stringified JSON content

```markdown
---
id: "scene-123"
title: "The Great Escape"
order: 5
status: "draft"
word_count: 842
povCharacter: "John"
createdAt: "2024-01-15T10:30:00Z"
updatedAt: "2024-01-20T14:22:00Z"
---
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"John woke to the sound of thunder."}]}]}
```

**Parsing Logic** (`save_scene`):
1. Parse existing frontmatter (preserve `id`, `createdAt`)
2. Update `title`, `word_count`, `updatedAt`
3. Replace content portion
4. Write back to file

---

#### Codex Entry (`codex/<category>/<id>.json`)

**Format**: Pure JSON

```json
{
  "id": "char-john-123",
  "name": "John Smith",
  "category": "character",
  "description": "A brave adventurer seeking redemption.",
  "aliases": ["The Wanderer", "Johnny"],
  "tags": ["protagonist", "male"],
  "attributes": {
    "age": "32",
    "occupation": "Former soldier"
  },
  "created_at": 1705315200000,
  "updated_at": 1705401600000
}
```

---

#### Project Structure (`structure.json`)

**Format**: Nested JSON tree

```json
[
  {
    "id": "act-1",
    "type": "act",
    "title": "Act I: The Beginning",
    "order": 0,
    "children": [
      {
        "id": "chapter-1",
        "type": "chapter",
        "title": "Chapter 1: Awakening",
        "order": 0,
        "children": [
          {
            "id": "scene-1",
            "type": "scene",
            "title": "The Great Escape",
            "order": 0,
            "file": "act-1-chapter-1-scene-1.md",
            "children": []
          }
        ]
      }
    ]
  }
]
```

---

### 5.3 Path Resolution

**Implementation**: `utils/paths.rs`

```rust
/// Get the application root directory
/// Returns: ~/BecomeAnAuthor
pub fn get_app_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_dir = home.join("BecomeAnAuthor");
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    Ok(app_dir)
}

/// Get the projects directory
/// Returns: ~/BecomeAnAuthor/Projects
pub fn get_projects_dir() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let projects_dir = app_dir.join("Projects");
    fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
    Ok(projects_dir)
}

/// Resolve a project directory
/// Returns: ~/BecomeAnAuthor/Projects/<project_path>
pub fn project_dir(project_path: &str) -> Result<PathBuf, String> {
    let projects_dir = get_projects_dir()?;
    Ok(projects_dir.join(project_path))
}
```

**Usage in Commands**:

```rust
#[tauri::command]
pub fn load_scene(project_path: String, scene_file: String) -> Result<Scene, String> {
    let project_dir = project_dir(&project_path)?;
    let scene_path = project_dir.join("scenes").join(&scene_file);
    
    let content = fs::read_to_string(&scene_path)
        .map_err(|e| format!("Failed to read scene: {}", e))?;
    
    // Parse frontmatter + content...
}
```

---

## 6. Security Architecture

### 6.1 API Key Storage (OS Keychain)

**Implementation**: `commands/security.rs` (191 lines)

**Features**:
- **OS-Level Encryption**: Uses platform keychains
  - macOS: Keychain
  - Windows: Credential Manager
  - Linux: Secret Service
- **No Plain Text**: Keys never stored in `.env` or config files
- **Provider-Scoped**: Keys stored as `"api-key-<provider>"`

**Code**:

```rust
use keyring::Entry;

const SERVICE_NAME: &str = "com.becomeauthor.app";

#[tauri::command]
pub fn store_api_key(provider: String, key: String) -> Result<(), String> {
    // Validate inputs
    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }
    
    // Create keyring entry: service="com.becomeauthor.app", account="api-key-<provider>"
    let account = format!("api-key-{}", provider);
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    // Store password (API key) - encrypted by OS
    entry.set_password(&key)
        .map_err(|e| format!("Failed to store API key: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    let account = format!("api-key-{}", provider);
    let entry = Entry::new(SERVICE_NAME, &account)?;
    
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),  // Not an error
        Err(e) => Err(format!("Failed to retrieve API key: {}", e)),
    }
}
```

**Security Properties**:
- ✅ Encrypted at rest (OS-level)
- ✅ Requires user authentication (OS-level)
- ✅ Survives app updates
- ✅ Separate from project files

---

### 6.2 Path Validation

**Implementation**: `utils/validation.rs` (355 lines)

#### Path Traversal Prevention

```rust
/// Validate project title is safe (no path separators, no .., etc.)
pub fn validate_project_title(title: &str) -> Result<(), String> {
    if title.is_empty() {
        return Err("Project title cannot be empty".to_string());
    }
    
    // Disallow path separators
    if title.contains('/') || title.contains('\\') {
        return Err("Project title cannot contain path separators".to_string());
    }
    
    // Disallow dangerous path components
    if title == "." || title == ".." || title.starts_with('.') {
        return Err("Project title cannot start with '.' or be '.' or '..'".to_string());
    }
    
    // Disallow dangerous characters
    let dangerous_chars = ['*', '?', '<', '>', '|', ':', '"', '\0'];
    if title.chars().any(|c| dangerous_chars.contains(&c)) {
        return Err("Project title contains invalid characters".to_string());
    }
    
    Ok(())
}
```

**Blocked Patterns**:
- ❌ `../../../etc/passwd` → Path traversal
- ❌ `.hidden` → Hidden file
- ❌ `project/sub` → Path separator
- ❌ `project*` → Wildcard
- ❌ `project\0` → Null byte

---

#### Path Sanitization

```rust
/// Convert user input to safe filesystem name
/// "My Novel!" → "my-novel"
pub fn sanitize_path_component(input: &str) -> String {
    input
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'a'..='z' | '0'..='9' | '-' | '_' => c,
            ' ' => '-',
            _ => '_',
        })
        .collect::<String>()
        .trim_matches('-')
        .trim_matches('_')
        .to_string()
}
```

**Examples**:
- `"My Novel"` → `"my-novel"`
- `"The Great Adventure!"` → `"the-great-adventure"`
- `"../../../etc/passwd"` → `"etc_passwd"`

---

### 6.3 Size Validation

**Constants** (`validation.rs`):

```rust
pub const MAX_PROJECT_TITLE_LENGTH: usize = 200;
pub const MAX_SCENE_TITLE_LENGTH: usize = 500;
pub const MAX_CODEX_NAME_LENGTH: usize = 300;
pub const MAX_SCENE_SIZE: u64 = 10 * 1024 * 1024;      // 10 MB
pub const MAX_JSON_SIZE: usize = 5 * 1024 * 1024;      // 5 MB
pub const MAX_PROJECT_SIZE: u64 = 1024 * 1024 * 1024;  // 1 GB
```

**Validation**:

```rust
pub fn validate_scene_content(content: &str) -> Result<(), String> {
    let size = content.as_bytes().len() as u64;
    validate_file_size(size, MAX_SCENE_SIZE, "Scene content")
}

pub fn validate_file_size(size: u64, max_size: u64, file_type: &str) -> Result<(), String> {
    if size > max_size {
        return Err(format!(
            "{} too large: {} bytes (max {} bytes)",
            file_type, size, max_size
        ));
    }
    Ok(())
}
```

**Purpose**: Prevent denial-of-service (DoS) via oversized payloads.

---

## 7. Validation Layer

### 7.1 Input Validation Strategy

**Philosophy**: Validate at command entry, fail fast.

**Layers**:
1. **Type Safety** (Rust compiler) — Enforces types at compile time
2. **Serde Validation** (deserialization) — Ensures JSON matches schema
3. **Custom Validation** (`validation.rs`) — Business rules

**Example**:

```rust
#[tauri::command]
pub fn create_project(title: String, author: String) -> Result<ProjectMeta, String> {
    // Layer 3: Custom validation
    validate_project_creation(&title, Some(&author))?;
    
    // Sanitize for filesystem
    let safe_name = sanitize_path_component(&title);
    
    // Check for duplicates
    if project_exists(&safe_name)? {
        return Err("Project with this name already exists".to_string());
    }
    
    // Create project...
}
```

### 7.2 Validation Rules

| Input Type | Rules | Max Length |
|------------|-------|------------|
| **Project Title** | No `/`, `\`, `..`, `.`, dangerous chars | 200 chars |
| **Scene Title** | No `/`, `\` | 500 chars |
| **Codex Name** | No restrictions (used in JSON only) | 300 chars |
| **UUID** | Format: `8-4-4-4-12` (hexadecimal) | 36 chars |
| **Scene Content** | No null bytes | 10 MB |
| **JSON Payload** | Valid JSON | 5 MB |

### 7.3 UUID Validation

```rust
pub fn validate_uuid_format(uuid: &str) -> Result<(), String> {
    let parts: Vec<&str> = uuid.split('-').collect();
    if parts.len() != 5 {
        return Err("Invalid UUID format".to_string());
    }
    
    if parts[0].len() != 8
        || parts[1].len() != 4
        || parts[2].len() != 4
        || parts[3].len() != 4
        || parts[4].len() != 12
    {
        return Err("Invalid UUID format".to_string());
    }
    
    // Check all parts are hexadecimal
    for part in parts {
        if !part.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err("UUID contains non-hexadecimal characters".to_string());
        }
    }
    
    Ok(())
}
```

---

## 8. Error Handling

### 8.1 Error Pattern

**All commands return** `Result<T, String>`:

```rust
#[tauri::command]
pub fn load_scene(project_path: String, scene_file: String) -> Result<Scene, String> {
    // Use ? operator to propagate errors
    let project_dir = project_dir(&project_path)?;
    let scene_path = project_dir.join("scenes").join(&scene_file);
    
    let content = fs::read_to_string(&scene_path)
        .map_err(|e| format!("Failed to read scene: {}", e))?;
    
    // Parse and return...
}
```

**Error Conversion** (`map_err`):

```rust
fs::write(&path, &json)
    .map_err(|e| format!("Failed to write file: {}", e))?;
```

### 8.2 Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| **File Not Found** | Scene doesn't exist | Return error, frontend shows toast |
| **Permission Denied** | Cannot write to directory | Return error, suggest fix |
| **Invalid Input** | Project title has `/` | Return validation error |
| **Parsing Error** | Malformed JSON | Return error with context |
| **Size Limit** | Scene > 10MB | Return error with limit |

### 8.3 Logging

**Implementation**: `log` crate

```rust
use log::{info, warn, error};

#[tauri::command]
pub fn save_scene(project_path: String, scene_file: String, content: String) -> Result<SceneMeta, String> {
    info!("Saving scene: {} in project: {}", scene_file, project_path);
    
    // Validation
    if content.len() > MAX_SCENE_SIZE as usize {
        warn!("Scene content exceeds size limit: {} bytes", content.len());
        return Err("Scene too large".to_string());
    }
    
    // Save logic...
    
    info!("Successfully saved scene: {}", scene_file);
    Ok(meta)
}
```

**Log Levels**:
- `info!` — Normal operations
- `warn!` — Recoverable issues (e.g., size limits)
- `error!` — Failures (e.g., I/O errors)

**Output**: `backend/logs/app.log.<date>`

---

## 9. Design Decisions

### 9.1 Why Filesystem Over Database?

**Decision**: Store all data in JSON/Markdown files instead of SQLite/PostgreSQL.

**Rationale**:

| Aspect | Filesystem | Database |
|--------|------------|----------|
| **Human-Readable** | ✅ Can edit with any text editor | ❌ Binary format |
| **Version Control** | ✅ Git-friendly (plain text diffs) | ❌ Binary diffs |
| **Backup** | ✅ Copy entire folder | ⚠️ Requires export |
| **Migration** | ✅ No schema migrations | ❌ Complex migrations |
| **Portability** | ✅ Cross-platform (files) | ⚠️ Depends on DB engine |
| **Query Performance** | ❌ Slower for complex queries | ✅ Optimized indexes |
| **Transaction Safety** | ❌ No ACID guarantees | ✅ Full ACID |

**Verdict**: For a writing app with moderate data volume (<10K files per project), filesystem is sufficient and provides better UX (manual editing, Git integration).

**Trade-offs Accepted**:
- No relational queries (frontend handles joins)
- No transactions (save coordinator prevents race conditions)
- Slower full-text search (acceptable for < 1000 scenes)

---

### 9.2 Why Markdown + YAML for Scenes?

**Decision**: Store scene content as Markdown files with YAML frontmatter.

**Rationale**:
- **Human-Readable**: Writers can edit scenes in any Markdown editor
- **Metadata Separation**: YAML frontmatter for metadata, Markdown for content
- **Git-Friendly**: Plain text diffs show exactly what changed
- **Future-Proof**: Format will remain readable in 10+ years

**Format**:

```markdown
---
id: "scene-123"
title: "The Great Escape"
---
{"type":"doc","content":[...]}
```

**Why Stringified JSON in Content?**  
Tiptap uses ProseMirror JSON format. We store it as stringified JSON to preserve structure while keeping the file `.md`.

---

### 9.3 Why OS Keychain for API Keys?

**Decision**: Use `keyring` crate to store API keys in OS-level keychain instead of `.env` files.

**Rationale**:

| Aspect | OS Keychain | `.env` File |
|--------|-------------|-------------|
| **Security** | ✅ Encrypted at rest | ❌ Plain text |
| **Authentication** | ✅ Requires user login | ❌ Anyone with file access |
| **Git Safety** | ✅ Not in project directory | ⚠️ Can be accidentally committed |
| **Portability** | ✅ Survives app updates | ⚠️ Needs manual backup |

**Implementation**: `keyring` crate abstracts platform differences:
- macOS: Keychain Access
- Windows: Credential Manager
- Linux: Secret Service (GNOME Keyring, KWallet)

---

### 9.4 Why Rust + Tauri?

**Decision**: Use Rust for backend instead of Node.js/Electron.

**Comparison**:

| Aspect | Rust + Tauri | Node.js + Electron |
|--------|--------------|---------------------|
| **Bundle Size** | ✅ ~10MB | ❌ ~100MB (includes Chromium) |
| **Memory Usage** | ✅ ~50MB | ❌ ~200MB |
| **Security** | ✅ Memory-safe, no GC pauses | ⚠️ Prototype pollution |
| **Performance** | ✅ Native speed | ⚠️ Slower (V8) |
| **Type Safety** | ✅ Strict compiler | ⚠️ TypeScript optional |
| **Ecosystem** | ⚠️ Smaller (but growing) | ✅ Huge (npm) |

**Verdict**: For a desktop app with heavy file I/O, Rust provides better performance and security.

---

### 9.5 Why No Relational Queries?

**Decision**: Frontend handles all joins/filters instead of backend SQL queries.

**Rationale**:
- **Simplicity**: Backend is purely CRUD (no query engine)
- **Flexibility**: Frontend can change queries without backend updates
- **Caching**: Frontend can cache frequently-used data

**Example**: Get scenes with specific codex entries

**❌ SQL Approach** (if we used DB):
```sql
SELECT scenes.* FROM scenes
JOIN scene_codex_links ON scenes.id = scene_codex_links.scene_id
WHERE scene_codex_links.codex_id = 'char-123';
```

**✅ Our Approach** (frontend):
```typescript
const links = await repo.listSceneCodexLinks(projectId);
const filteredLinks = links.filter(link => link.codexId === 'char-123');
const scenes = await Promise.all(
    filteredLinks.map(link => repo.getScene(link.sceneId))
);
```

**Trade-off**: More frontend code, but backend stays simple.

---

## Conclusion

The backend architecture is a **secure, filesystem-based Rust application** with clear design principles:

**Strengths**:
- ✅ **Security-First**: OS Keychain, path validation, size limits
- ✅ **Human-Readable**: All data in JSON/Markdown
- ✅ **Git-Friendly**: Plain text enables version control
- ✅ **Type-Safe**: Rust compiler catches errors at compile time
- ✅ **Simple**: No database, no migrations, no complex queries
- ✅ **Portable**: Entire project is a folder of files

**Weaknesses**:
- ⚠️ **No ACID**: File writes are not transactional
- ⚠️ **Limited Queries**: No SQL-like query engine
- ⚠️ **No Indexing**: Full-text search is slower
- ⚠️ **3 Unused Commands**: Technical debt (`rename_node`, `delete_node`, `save_scene_by_id`)

**Recommended Next Steps**:
1. **Remove** unused commands
2. **Add** batch operations (e.g., `batch_save_scenes`)
3. **Improve** error messages (more context)
4. **Add** file locking (prevent concurrent writes)
5. **Implement** transaction-like patterns (write to temp, then rename)

---

**Document Status**: ✅ Complete  
**Last Updated**: 2025-12-25  
**Command Modules Documented**: 13/13  
**Data Models Documented**: 7/7  
**Utility Modules Documented**: 6/6  
**Security Features Documented**: 100%
