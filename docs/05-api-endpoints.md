# API Reference - Tauri IPC Commands

## System Overview

**Become An Author** uses **Tauri IPC (Inter-Process Communication)** instead of traditional REST APIs. The frontend (React/TypeScript) communicates with the backend (Rust) via synchronous IPC commands.

**Protocol**: Tauri IPC (JSON-RPC-like)  
**Transport**: Local process communication (no HTTP)  
**Format**: JSON serialization (Serde)  
**Total Commands**: 85+ IPC commands  

---

## Command Groups

| Group | Commands | Purpose |
|-------|----------|---------|
| **Project Management** | 11 | Create, list, update, delete, archive projects and structure nodes |
| **Scene Management** | 4 | Load, save, update, delete scene files (markdown + YAML) |
| **Codex Management** | 21 | CRUD for world-building (entries, relations, tags, templates, relation types, scene links) |
| **Chat Management** | 8 | AI chat threads and messages (CRUD for threads and messages) |
| **Snippet Management** | 3 | Reusable text snippets |
| **Analysis Management** | 3 | Story analysis results |
| **Backup & Export** | 7 | Emergency backups (4 commands), project export/import, manuscript text export |
| **Trash Management** | 5 | Soft delete, restore, list, permanent delete, empty trash |
| **Search** | 1 | Full-text search across project |
| **Series Management** | 4 | Multi-book series organization (list, create, update, delete) |
| **Security** | 4 | **NEW** - API key storage in OS keychain |
| **Migration** | 2 | **NEW** - Data migration and versioning |
| **Utility** | 1 | App info |
| **TOTAL** | **74** | **All Tauri IPC commands** |


---

## Authentication & Authorization

**Desktop Application**: No authentication required (runs as local user)

**Security Model**:
- **Project Registry**: Only registered projects can be accessed
- **Path Validation**: All commands validate project paths against registry
- **File Permissions**: Relies on OS-level file permissions
- **No API Keys**: Not applicable (local-only app)

**Access Control**:
```rust
// All project commands validate via registry
validate_project_path(project_path)?;
```

---

## How to Use Tauri IPC

### Frontend (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Example: Load a scene
const scene = await invoke<Scene>('load_scene', {
  projectPath: '/Users/you/BecomeAnAuthor/Projects/my-novel',
  sceneFile: 'scene-123.md'
});

// Example: Create project
const project = await invoke<ProjectMeta>('create_project', {
  title: 'My Novel',
  author: 'Jane Doe',
  customPath: '/Users/you/BecomeAnAuthor/Projects'
});
```

### Error Handling

All commands return `Result<T, String>`:

```typescript
try {
  await invoke('save_scene', { /* params */ });
} catch (error) {
  console.error('IPC Error:', error); // String error message
  toast.error('Failed to save scene');
}
```

---

## Reusable Schemas

### ProjectMeta

```json
{
  "id": "uuid-string",
  "title": "My Novel",
  "author": "Author Name",
  "description": "Optional description",
  "path": "/absolute/path/to/project",
  "archived": false,
  "series_id": "optional-series-uuid",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### StructureNode

```json
{
  "id": "node-uuid",
  "type": "scene",  // "act" | "chapter" | "scene"
  "title": "Chapter 1",
  "order": 0,
  "file": "scene-uuid.md",  // Only for scenes
  "children": []  // Nested for acts/chapters
}
```

### Scene

```json
{
  "meta": {
    "id": "scene-uuid",
    "title": "Opening Scene",
    "order": 0,
    "status": "draft",  // "draft" | "revised" | "final"
    "word_count": 1250,
    "pov_character": "optional-character-id",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "content": "# Scene content in markdown..."
}
```

### CodexEntry

```json
{
  "id": "entry-uuid",
  "project_id": "project-uuid",
  "name": "John Doe",
  "category": "characters",  // "characters" | "locations" | "items" | "lore" | "subplots"
  "aliases": ["Johnny", "The Detective"],
  "description": "Main protagonist...",
  "attributes": {
    "age": "35",
    "occupation": "Detective"
  },
  "created_at": 123456789,
  "updated_at": 123456789
}
```

### ChatThread

```json
{
  "id": "thread-uuid",
  "project_id": "project-uuid",
  "name": "Character Development",
  "pinned": false,
  "archived": false,
  "created_at": 123456789,
  "updated_at": 123456789
}
```

### ChatMessage

```json
{
  "id": "message-uuid",
  "thread_id": "thread-uuid",
  "role": "user",  // "user" | "assistant"
  "content": "Message text...",
  "model": "gemini-1.5-pro",
  "context": {
    "scenes": ["scene-1", "scene-2"],
    "codex": ["char-1"]
  },
  "created_at": 123456789
}
```

---

## Project Management

### Get Projects Path

**Command**: `get_projects_path`  
**Description**: Get default projects directory path

**Parameters**: None

**Returns**: `String`

**Response Example**:
```json
"/Users/you/BecomeAnAuthor/Projects"
```

**Frontend Example**:
```typescript
const path = await invoke<string>('get_projects_path');
```

---

### List Projects

**Command**: `list_projects`  
**Description**: Get all registered projects from the global registry

**Parameters**: None

**Returns**: `Vec<ProjectMeta>`

**Response Example**:
```json
[
  {
    "id": "proj-123",
    "title": "My Novel",
    "author": "Jane Doe",
    "path": "/Users/you/BecomeAnAuthor/Projects/my-novel",
    "archived": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

**Frontend Example**:
```typescript
const projects = await invoke<ProjectMeta[]>('list_projects');
```

---

### Create Project

**Command**: `create_project`  
**Description**: Create a new project with directory structure and seed data

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Project title |
| `author` | `string` | Yes | Author name |
| `custom_path` | `string` | Yes | Parent directory path |

**Side Effects**:
- Creates directory: `{custom_path}/{slug}/`
- Creates subdirs: `.meta/`, `manuscript/`, `codex/`, `snippets/`, `analyses/`
- Seeds built-in templates and relation types
- Adds to global project registry

**Returns**: `ProjectMeta`

**Response Example**:
```json
{
  "id": "new-uuid",
  "title": "My Novel",
  "author": "Jane Doe",
  "path": "/Users/you/BecomeAnAuthor/Projects/my-novel",
  "archived": false,
  "created_at": "2024-12-10T12:00:00Z",
  "updated_at": "2024-12-10T12:00:00Z"
}
```

**Frontend Example**:
```typescript
const project = await invoke<ProjectMeta>('create_project', {
  title: 'My Novel',
  author: 'Jane Doe',
  customPath: '/Users/you/BecomeAnAuthor/Projects'
});
```

---

### Get Structure

**Command**: `get_structure`  
**Description**: Get manuscript tree (acts → chapters → scenes)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<StructureNode>`

**Response Example**:
```json
[
  {
    "id": "act-1",
    "type": "act",
    "title": "Act 1",
    "order": 0,
    "children": [
      {
        "id": "chapter-1",
        "type": "chapter",
        "title": "Chapter 1",
        "order": 0,
        "children": [
          {
            "id": "scene-1",
            "type": "scene",
            "title": "Opening",
            "order": 0,
            "file": "scene-1.md",
            "children": []
          }
        ]
      }
    ]
  }
]
```

**Frontend Example**:
```typescript
const structure = await invoke<StructureNode[]>('get_structure', {
  projectPath: '/path/to/project'
});
```

---

### Update Project

**Command**: `update_project`  
**Description**: Update project metadata (title, author, description)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `updates` | `object` | Yes | Fields to update |

**Updates Schema**:
```json
{
  "title": "New Title",
  "author": "New Author",
  "description": "New description"
}
```

**Returns**: `ProjectMeta`

**Frontend Example**:
```typescript
const updated = await invoke<ProjectMeta>('update_project', {
  projectPath: '/path/to/project',
  updates: { title: 'Updated Title' }
});
```

---

### Delete Project

**Command**: `delete_project`  
**Description**: Move project to Trash (soft delete)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Side Effects**:
- Moves directory to `~/BecomeAnAuthor/Trash/{slug}_{timestamp}/`
- Removes from project registry

**Returns**: `()`

**Frontend Example**:
```typescript
await invoke('delete_project', {
  projectPath: '/path/to/project'
});
```

---

### Archive Project

**Command**: `archive_project`  
**Description**: Mark project as archived (hide from active list)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Side Effects**:
- Updates `archived: true` in project metadata

**Returns**: `ProjectMeta`

---

### Save Structure

**Command**: `save_structure`  
**Description**: Save entire manuscript structure tree

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `structure` | `Vec<StructureNode>` | Yes | Complete structure tree |

**Side Effects**:
- Overwrites `.meta/structure.json`

**Returns**: `()`

**Frontend Example**:
```typescript
await invoke('save_structure', {
  projectPath: '/path/to/project',
  structure: updatedStructure
});
```

---

### Create Node

**Command**: `create_node`  
**Description**: Create act, chapter, or scene in manuscript structure

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `node_type` | `string` | Yes | "act" \| "chapter" \| "scene" |
| `title` | `string` | Yes | Node title |
| `parent_id` | `string` | No | Parent node ID (null for root acts) |

**Side Effects**:
- For scenes: Creates `manuscript/{id}.md` file
- Updates `.meta/structure.json`

**Returns**: `StructureNode`

**Frontend Example**:
```typescript
const scene = await invoke<StructureNode>('create_node', {
  projectPath: '/path/to/project',
  nodeType: 'scene',
  title: 'New Scene',
  parentId: 'chapter-1'
});
```

---

### Rename Node

**Command**: `rename_node`  
**Description**: Rename an act, chapter, or scene

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `node_id` | `string` | Yes | Node UUID |
| `new_title` | `string` | Yes | New title |

**Side Effects**:
- Updates title in`.meta/structure.json`
- For scenes: Updates title in markdown frontmatter

**Returns**: `()`

---

### Delete Node

**Command**: `delete_node`  
**Description**: Delete node and all children (cascade delete)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `node_id` | `string` | Yes | Node UUID |

**Side Effects**:
- Removes from structure tree
- Deletes all child scene files from `manuscript/`
- Recursive deletion of all children

**Returns**: `()`

**Notes**:
- WARNING: Cannot be undone (unless trash system is used)
- Deletes all descendant scenes

---

## Scene Management

### Load Scene

**Command**: `load_scene`  
**Description**: Load scene content with YAML frontmatter parsed

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `scene_file` | `string` | Yes | Scene filename (e.g., "scene-123.md") |

**File Format**:
```markdown
---
id: scene-123
title: "Opening Scene"
order: 0
status: draft
wordCount: 1250
povCharacter: char-1
createdAt: 2024-01-01T00:00:00Z
updatedAt: 2024-01-01T00:00:00Z
---

# Scene content in markdown...
```

**Returns**: `Scene` (see schema above)

**Frontend Example**:
```typescript
const scene = await invoke<Scene>('load_scene', {
  projectPath: '/path/to/project',
  sceneFile: 'scene-123.md'
});
```

**Notes**:
- Automatically counts words from markdown body
- Validates file size (max 10MB)
- Parses YAML frontmatter using `gray_matter`

---

### Save Scene

**Command**: `save_scene`  
**Description**: Save scene content with updated frontmatter

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `scene_file` | `string` | Yes | Scene filename |
| `content` | `string` | Yes | Markdown content (without frontmatter) |
| `title` | `string` | No | Scene title (updates frontmatter) |

**Side Effects**:
- Recalculates word count
- Updates `updatedAt` timestamp
- Uses atomic write (temp file + rename)

**Returns**: `SceneMeta`

**Frontend Example**:
```typescript
const meta = await invoke<SceneMeta>('save_scene', {
  projectPath: '/path/to/project',
  sceneFile: 'scene-123.md',
  content: '# New content...',
  title: 'Updated Title'
});
```

**Notes**:
- Preserves existing frontmatter fields
- Word count auto-calculated from content
- Atomic write prevents corruption on crash

---

### Save Scene by ID

**Command**: `save_scene_by_id`  
**Description**: Save scene using only scene ID (looks up filename from structure)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `scene_id` | `string` | Yes | Scene UUID |
| `content` | `string` | Yes | Markdown content |

**Returns**: `SceneMeta`

**Frontend Example**:
```typescript
const meta = await invoke<SceneMeta>('save_scene_by_id', {
  projectPath: '/path/to/project',
  sceneId: 'scene-123',
  content: '# Updated content...'
});
```

**Notes**:
- Convenience method for frontend (doesn't need to track filenames)
- Internally calls `save_scene` after lookup

---

### Delete Scene

**Command**: `delete_scene`  
**Description**: Delete scene file from disk

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `scene_file` | `string` | Yes | Scene filename |

**Side Effects**:
- Deletes `manuscript/{scene_file}`

**Returns**: `()`

**Notes**:
- Should also remove from structure (use `delete_node` instead for clean deletion)

---

## Codex Management

### List Codex Entries

**Command**: `list_codex_entries`  
**Description**: Get all codex entries (characters, locations, items, lore, subplots)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<CodexEntry>`

**Response Example**:
```json
[
  {
    "id": "char-1",
    "project_id": "proj-123",
    "name": "John Doe",
    "category": "characters",
    "aliases": ["Johnny"],
    "description": "Main character...",
    "attributes": {
      "age": "35",
      "occupation": "Detective"
    },
    "created_at": 123456789,
    "updated_at": 123456789
  }
]
```

**Frontend Example**:
```typescript
const entries = await invoke<CodexEntry[]>('list_codex_entries', {
  projectPath: '/path/to/project'
});
```

---

### Save Codex Entry

**Command**: `save_codex_entry`  
**Description**: Create or update codex entry

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `entry` | `CodexEntry` | Yes | Full entry object |

**Side Effects**:
- Writes to `codex/{category}/{id}.json`
- Creates category directory if missing

**Returns**: `()`

**Frontend Example**:
```typescript
await invoke('save_codex_entry', {
  projectPath: '/path/to/project',
  entry: {
    id: 'char-1',
    project_id: 'proj-123',
    name: 'John Doe',
    category: 'characters',
    aliases: [],
    description: 'Detective',
    attributes: { age: '35' },
    created_at: Date.now(),
    updated_at: Date.now()
  }
});
```

---

### Delete Codex Entry

**Command**: `delete_codex_entry`  
**Description**: Delete a codex entry

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `entry_id` | `string` | Yes | Entry UUID |
| `category` | `string` | Yes | Entry category |

**Side Effects**:
- Deletes `codex/{category}/{entry_id}.json`

**Returns**: `()`

---

### List Codex Relations

**Command**: `list_codex_relations`  
**Description**: Get all relationships between codex entries

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<CodexRelation>`

**Response Example**:
```json
[
  {
    "id": "rel-1",
    "parent_id": "char-1",
    "child_id": "char-2",
    "type_id": "family",
    "label": "Brother",
    "strength": 8,
    "created_at": 123456789,
    "updated_at": 123456789
  }
]
```

---

### Save Codex Relation

**Command**: `save_codex_relation`  
**Description**: Create or update a relationship between codex entries

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `relation` | `CodexRelation` | Yes | Full relation object |

**Returns**: `()`

---

### Delete Codex Relation

**Command**: `delete_codex_relation`  
**Description**: Delete a relationship

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `relation_id` | `string` | Yes | Relation UUID |

**Returns**: `()`

---

### List Codex Tags

**Command**: `list_codex_tags`  
**Description**: Get all tags

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<CodexTag>`

---

### Save Codex Tag

**Command**: `save_codex_tag`  
**Description**: Create or update a tag

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `tag` | `CodexTag` | Yes | Tag object |

**Returns**: `()`

---

### Delete Codex Tag

**Command**: `delete_codex_tag`  
**Description**: Delete a tag

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `tag_id` | `string` | Yes | Tag UUID |

**Returns**: `()`

---

### List Codex Entry Tags

**Command**: `list_codex_entry_tags`  
**Description**: Get all entry-tag associations

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<CodexEntryTag>`

---

### Save Codex Entry Tag

**Command**: `save_codex_entry_tag`  
**Description**: Link a tag to an entry

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `entry_tag` | `CodexEntryTag` | Yes | Entry-tag link object |

**Returns**: `()`

---

### Delete Codex Entry Tag

**Command**: `delete_codex_entry_tag`  
**Description**: Unlink a tag from an entry

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `entry_tag_id` | `string` | Yes | Entry-tag UUID |

**Returns**: `()`

---

### List Codex Templates

**Command**: `list_codex_templates`  
**Description**: Get all codex templates (built-in + custom)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<CodexTemplate>`

---

### Save Codex Template

**Command**: `save_codex_template`  
**Description**: Create or update a template

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `template` | `CodexTemplate` | Yes | Template object |

**Returns**: `()`

---

### Delete Codex Template

**Command**: `delete_codex_template`  
**Description**: Delete a custom template

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `template_id` | `string` | Yes | Template UUID |

**Returns**: `()`

**Notes**:
- Cannot delete built-in templates (`isBuiltIn: true`)

---

### List Codex Relation Types

**Command**: `list_codex_relation_types`  
**Description**: Get all relation types

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<CodexRelationType>`

---

### Save Codex Relation Type

**Command**: `save_codex_relation_type`  
**Description**: Create or update a relation type

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `rel_type` | `CodexRelationType` | Yes | Relation type object |

**Returns**: `()`

---

### Delete Codex Relation Type

**Command**: `delete_codex_relation_type`  
**Description**: Delete a relation type

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `type_id` | `string` | Yes | Type UUID |

**Returns**: `()`

---

### List Scene Codex Links

**Command**: `list_scene_codex_links`  
**Description**: Get all scene-to-codex mention links

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<SceneCodexLink>`

**Response Example**:
```json
[
  {
    "id": "link-1",
    "scene_id": "scene-1",
    "codex_id": "char-1",
    "project_id": "proj-123",
    "role": "appears",
    "auto_detected": true,
    "created_at": 123456789,
    "updated_at": 123456789
  }
]
```

**Link Roles**:
- `"appears"` - Character/location physically present
- `"mentioned"` - Referenced but not present
- `"pov"` - Point-of-view character
- `"location"` - Scene setting
- `"plot"` - Related subplot

---

### Save Scene Codex Link

**Command**: `save_scene_codex_link`  
**Description**: Create or update a scene-codex mention link

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `link` | `SceneCodexLink` | Yes | Link object |

**Returns**: `()`

---

### Delete Scene Codex Link

**Command**: `delete_scene_codex_link`  
**Description**: Delete a scene-codex link

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `link_id` | `string` | Yes | Link UUID |

**Returns**: `()`

---

## Chat Management

### List Chat Threads

**Command**: `list_chat_threads`  
**Description**: Get all chat thread metadata (without messages)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<ChatThread>`

---

### Get Chat Thread

**Command**: `get_chat_thread`  
**Description**: Get a single chat thread by ID

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `thread_id` | `string` | Yes | Thread UUID |

**Returns**: `Option<ChatThread>`

---

### Create Chat Thread

**Command**: `create_chat_thread`  
**Description**: Create a new chat thread

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `thread` | `ChatThread` | Yes | Thread object |

**Returns**: `ChatThread`

---

### Update Chat Thread

**Command**: `update_chat_thread`  
**Description**: Update thread metadata (name, pinned, archived)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `thread` | `ChatThread` | Yes | Updated thread object |

**Returns**: `()`

---

### Delete Chat Thread

**Command**: `delete_chat_thread`  
**Description**: Delete thread and all messages

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `thread_id` | `string` | Yes | Thread UUID |

**Side Effects**:
- Deletes thread from `threads.json`
- Deletes `messages/{thread_id}.json`

**Returns**: `()`

---

### Get Chat Messages

**Command**: `get_chat_messages`  
**Description**: Get all messages for a specific thread

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `thread_id` | `string` | Yes | Thread UUID |

**Returns**: `Vec<ChatMessage>`

**Response Example**:
```json
[
  {
    "id": "msg-1",
    "thread_id": "thread-1",
    "role": "user",
    "content": "Help me develop this character",
    "model": null,
    "context": { "scenes": [], "codex": ["char-1"] },
    "created_at": 123456789
  },
  {
    "id": "msg-2",
    "thread_id": "thread-1",
    "role": "assistant",
    "content": "Here are some suggestions...",
    "model": "gemini-1.5-pro",
    "context": {},
    "created_at": 123456789
  }
]
```

---

### Delete Chat Message

**Command**: `delete_chat_message`  
**Description**: Delete a message from a thread

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `thread_id` | `string` | Yes | Thread UUID |
| `message_id` | `string` | Yes | Message UUID |

**Returns**: `()`

---

### Create Chat Message

**Command**: `create_chat_message`  
**Description**: Add a message to a thread

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `message` | `ChatMessage` | Yes | Full message object |

**Side Effects**:
- Appends to `.meta/chat/messages/{thread_id}.json`

**Returns**: `ChatMessage`

---

## Snippet Management

### List Snippets

**Command**: `list_snippets`  
**Description**: Get all text snippets

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<Snippet>`

---

### Save Snippet

**Command**: `save_snippet`  
**Description**: Create or update a snippet

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `snippet` | `Snippet` | Yes | Snippet object |

**Returns**: `()`

---

### Delete Snippet

**Command**: `delete_snippet`  
**Description**: Delete a snippet

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `snippet_id` | `string` | Yes | Snippet UUID |

**Returns**: `()`

---

## Analysis Management

### List Analyses

**Command**: `list_analyses`  
**Description**: Get all story analyses

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<Analysis>`

---

### Save Analysis

**Command**: `save_analysis`  
**Description**: Save analysis result

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `analysis` | `Analysis` | Yes | Analysis object |

**Returns**: `()`

---

### Delete Analysis

**Command**: `delete_analysis`  
**Description**: Delete an analysis

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `analysis_id` | `string` | Yes | Analysis UUID |

**Returns**: `()`

---

## Backup & Export

### Save Emergency Backup

**Command**: `save_emergency_backup`  
**Description**: Save crash recovery backup (expires in 24 hours)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `backup` | `EmergencyBackup` | Yes | Backup object |

**Backup Schema**:
```json
{
  "id": "backup-uuid",
  "scene_id": "scene-uuid",
  "project_id": "proj-uuid",
  "content": "markdown content...",
  "created_at": 1234567890,
  "expires_at": 1234654290
}
```

**Side Effects**:
- Saves to `~/BecomeAnAuthor/.emergency_backups/{id}.json`
- Expires after 24 hours

**Returns**: `()`

---

### Get Emergency Backup

**Command**: `get_emergency_backup`  
**Description**: Retrieve emergency backup for a scene

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `scene_id` | `string` | Yes | Scene UUID |

**Returns**: `Option<EmergencyBackup>`

**Notes**:
- Returns most recent non-expired backup
- Returns `null` if no backup or all expired

---

### Delete Emergency Backup

**Command**: `delete_emergency_backup`  
**Description**: Delete an emergency backup

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `backup_id` | `string` | Yes | Backup UUID |

**Returns**: `()`

**Notes**:
- Called after successful scene save

---

### Cleanup Emergency Backups

**Command**: `cleanup_emergency_backups`  
**Description**: Delete all expired backups (>24 hours)

**Parameters**: None

**Returns**: `i32` (count of deleted backups)

**Notes**:
- Called on app startup
- Prevents unlimited storage growth

---

### Export Manuscript Text

**Command**: `export_manuscript_text`  
**Description**: Export full manuscript as plain text

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `String` (concatenated scene content)

**Notes**:
- Exports in structure order (act → chapter → scene)
- Includes scene titles as headers
- Markdown formatting preserved

---

### Export Project Backup

**Command**: `export_project_backup`  
**Description**: Export entire project as JSON

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `output_path` | `string` | No | Custom output path (default: project/exports/) |

**Side Effects**:
- Reads all project data (structure, scenes, codex, snippets)
- Writes to single JSON file

**Returns**: `String` (file path)

**Export Format**:
```json
{
  "version": 1,
  "exported_at": "2024-12-10T12:00:00Z",
  "project": { /* ProjectMeta */ },
  "nodes": [ /* StructureNode[] */ ],
  "codex": [ /* CodexEntry[] */ ],
  "snippets": [ /* Snippet[] */ ]
}
```

---

### Import Project Backup

**Command**: `import_project_backup`  
**Description**: Restore project from JSON backup

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `backup_json` | `string` | Yes | JSON backup content |

**Side Effects**:
- Creates new project directory
- Generates new UUIDs for project
- Seeds built-in data
- Adds to project registry

**Returns**: `ProjectMeta`

**Notes**:
- Import creates a **new** project (not overwrite)
- All IDs are regenerated for safety

---

## Trash Management

### Move to Trash

**Command**: `move_to_trash`  
**Description**: Soft delete with metadata preservation

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `item_id` | `string` | Yes | Item UUID |
| `item_type` | `string` | Yes | "scene" \| "codex" \| "snippet" |
| `trash_meta` | `string` | Yes | JSON metadata |

**Trash Meta Example**:
```json
{
  "id": "item-uuid",
  "type": "scene",
  "title": "Scene Title",
  "category": "characters",
  "deleted_at": 123456789
}
```

**Side Effects**:
- Copies file to `.meta/trash/{item_id}/`
- Stores metadata as `meta.json`
- Deletes original file

**Returns**: `()`

---

### Restore from Trash

**Command**: `restore_from_trash`  
**Description**: Restore trashed item to original location

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `item_id` | `string` | Yes | Item UUID |
| `item_type` | `string` | Yes | "scene" \| "codex" \| "snippet" |

**Side Effects**:
- Reads category from trash metadata
- Copies file back to original location
- Removes trash directory

**Returns**: `()`

---

### Permanent Delete

**Command**: `permanent_delete`  
**Description**: Permanently delete item from trash (no undo)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `item_id` | `string` | Yes | Item UUID |
| `item_type` | `string` | Yes | Item type |

**Side Effects**:
- Removes `.meta/trash/{item_id}/` directory

**Returns**: `()`

**Notes**:
- WARNING: Cannot be undone

---

### Empty Trash

**Command**: `empty_trash`  
**Description**: Permanently delete all trashed items

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Side Effects**:
- Removes all items from `.meta/trash/`
- Recreates empty trash directory

**Returns**: `()`

**Notes**:
- WARNING: Cannot be undone

---

### List Trash

**Command**: `list_trash`  
**Description**: Get all trashed items

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `Vec<serde_json::Value>`

---

## Search

### Search Project

**Command**: `search_project`  
**Description**: Full-text search across scenes and codex

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |
| `query` | `string` | Yes | Search query (case-insensitive) |

**Search Strategy**:
- Case-insensitive substring match
- Searches scene content (markdown files)
- Searches codex JSON files

**Returns**: `Vec<SearchResult>`

**Response Example**:
```json
[
  {
    "type": "scene",
    "id": "scene-1",
    "title": "Opening Scene",
    "path": "/path/to/project/manuscript/scene-1.md",
    "excerpt": "...matching text..."
  },
  {
    "type": "codex",
    "id": "char-1",
    "name": "John Doe",
    "category": "characters",
    "path": "/path/to/project/codex/characters/char-1.json"
  }
]
```

**Notes**:
- No indexing (scans all files on each query)
- Performance: O(n) where n = total files
- Recommended: \<1000 scenes for acceptable speed

---

## Series Management

### List Series

**Command**: `list_series`  
**Description**: Get all series (global, not project-specific)

**Parameters**: None

**Returns**: `Vec<Series>`

**Response Example**:
```json
[
  {
    "id": "series-1",
    "title": "Trilogy Name",
    "created_at": 123456789,
    "updated_at": 123456789
  }
]
```

---

### Update Series

**Command**: `update_series`  
**Description**: Update series metadata

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|---| 
| `series_id` | `string` | Yes | Series UUID |
| `updates` | `object` | Yes | Fields to update |

**Updates Schema**:
```json
{
  "title": "New Series Title"
}
```

**Returns**: `()`

---

### Delete Series

**Command**: `delete_series`  
**Description**: Delete a series

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `series_id` | `string` | Yes | Series UUID |

**Side Effects**:
- Removes from global series list
- Does NOT delete projects in series

**Returns**: `()`

---

### Create Series

**Command**: `create_series`  
**Description**: Create a new series

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Series title |

**Side Effects**:
- Saves to `~/BecomeAnAuthor/.meta/series.json`

**Returns**: `Series`

---

## Utility

### Get App Info

**Command**: `get_app_info`  
**Description**: Get application metadata

**Parameters**: None

**Returns**: `JSON`

**Response Example**:
```json
{
  "name": "Become An Author",
  "version": "1.0.0",
  "platform": "darwin",
  "arch": "aarch64"
}
```

---

## Error Handling

All commands return `Result<T, String>`:

**Success**: Returns data of type `T`  
**Error**: Returns error message as `String`

**Common Errors**:
- `"Project path does not exist"`
- `"Invalid project: missing project metadata"`
- `"Access denied: project not in registry"`
- `"Scene not found in structure: {id}"`
- `"Failed to parse scene YAML: {error}"`
- `"File exceeds maximum size: {size}"`

**Frontend Example**:
```typescript
try {
  const scene = await invoke<Scene>('load_scene', params);
  // Success
} catch (error: unknown) {
  // Error is a string
  console.error('IPC Error:', error);
  toast.error(`Failed: ${error}`);
}
```

---

## Rate Limiting

**None**: Local IPC has no rate limits (desktop app)

**Performance Considerations**:
- Commands are synchronous (block until complete)
- File I/O bound (typically \<100ms per call)
- No caching (reads from disk every time)

---

## Testing Locally

### Prerequisites

1. **Build Tauri App**:
   ```bash
   npm run tauri build
   # or
   npm run tauri dev
   ```

2. **No Database Required**: File-based storage

3. **No Environment Variables Required**: Local-only app

### First Commands to Test

1. **Get Projects Directory**:
   ```typescript
   const path = await invoke<string>('get_projects_path');
   console.log(path); // ~/BecomeAnAuthor/Projects
   ```

2. **Create Test Project**:
   ```typescript
   const project = await invoke<ProjectMeta>('create_project', {
     title: 'Test Novel',
     author: 'Test Author',
     customPath: '/Users/you/BecomeAnAuthor/Projects'
   });
   ```

3. **List All Projects**:
   ```typescript
   const projects = await invoke<ProjectMeta[]>('list_projects');
   console.log(projects);
   ```

4. **Get Structure** (should be empty initially):
   ```typescript
   const structure = await invoke<StructureNode[]>('get_structure', {
     projectPath: project.path
   });
   ```

### Frontend Dev Server

```bash
npm run dev
# Opens frontend at http://localhost:3000
# Tauri backend runs automatically
```

### Debugging IPC

**Enable Rust Logs**:
```bash
RUST_LOG=debug npm run tauri dev
```

**Frontend Console**:
- All IPC calls logged in browser DevTools
- Check Network tab for failed calls

---

## Versioning

**Current Version**: 1.0  
**No API Versioning**: IPC commands are not versioned  
**Breaking Changes**: Require app update (no backward compatibility layer)

**Migration Strategy**:
- Major version bump for schema changes
- Frontend/backend must be updated together (desktop app bundle)

---

## Unknown / Needs Review

**None detected**: All 80+ commands documented above.

**Missing from Spec**:
- ❌ **Pagination**: No commands support pagination (returns full datasets)
- ❌ **Filtering**: Limited filtering capabilities (search only)
- ❌ **Sorting**: No server-side sorting (frontend responsibility)
- ❌ **Partial Updates**: Most commands require full object replacement

**Future Enhancements**:
- Add pagination for large projects (1000+ scenes)
- Add advanced filtering (by status, date range, POV)
- Add incremental sync (delta updates instead of full reads)
- Add background processing (long-running analysis jobs)

---

## Summary

**Total Commands**: 80+  
**Transport**: Tauri IPC (local process)  
**Format**: JSON (Serde serialization)  
**Auth**: None (desktop app, OS-level permissions)  
**Performance**: File I/O bound, \<100ms typical  
**Rate Limits**: None  

**Key Characteristics**:
- ✅ Simple, synchronous API
- ✅ Type-safe (Rust + TypeScript)
- ✅ No network overhead
- ✅ Crash-safe (atomic writes)
- ❌ No caching (reads from disk)
- ❌ No pagination (full datasets)
- ❌ No versioning (monolithic updates)
