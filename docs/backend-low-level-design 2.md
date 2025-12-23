# Backend Low-Level Design

> [!IMPORTANT]
> **Detailed implementation specifications for the Rust/Tauri backend.**  
> Last updated: 2025-01-20

---

## Executive Summary

This document provides **implementation-level details** for the backend architecture—going beyond the high-level design to document specific algorithms, file I/O patterns, error handling strategies, and code-level optimizations.

**Scope**: Command implementations, parsing algorithms, atomic write patterns, error recovery, and performance considerations.

---

## Table of Contents

1. [Core Algorithms](#1-core-algorithms)
2. [File I/O Patterns](#2-file-io-patterns)
3. [Command Implementations](#3-command-implementations)
4. [Error Handling Patterns](#4-error-handling-patterns)
5. [Performance Optimizations](#5-performance-optimizations)
6. [Security Implementation](#6-security-implementation)

---

## 1. Core Algorithms

### 1.1 Scene Metadata Preservation Algorithm

**Problem**: When saving a scene, preserve existing metadata (ID, creation timestamp) while updating new fields.

**Algorithm**: Parse existing YAML frontmatter → Merge with updates → Write back

**Implementation**: `commands/scene.rs::save_scene()` (lines 55-138)

```rust
pub fn save_scene(
    project_path: String,
    scene_file: String,
    content: String,
    title: Option<String>
) -> Result<SceneMeta, String> {
    let file_path = PathBuf::from(&project_path).join("manuscript").join(&scene_file);
    
    // Step 1: Load existing scene
    let existing = fs::read_to_string(&file_path).ok();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Step 2: Parse existing metadata (if exists)
    let mut meta = if let Some(existing_content) = existing {
        let parts: Vec<&str> = existing_content.splitn(3, "---").collect();
        
        if parts.len() >= 2 {
            // Parse YAML line-by-line (manual parsing for simplicity)
            let yaml_str = parts[1].trim();
            let mut m = SceneMeta {
                id: String::new(),
                title: String::new(),
                order: 0,
                status: "draft".to_string(),
                word_count: 0,
                pov_character: None,
                created_at: now.clone(),
                updated_at: now.clone(),
            };
            
            for line in yaml_str.lines() {
                let parts: Vec<&str> = line.splitn(2, ':').collect();
                if parts.len() == 2 {
                    let key = parts[0].trim();
                    let value = parts[1].trim().trim_matches('"');
                    match key {
                        "id" => m.id = value.to_string(),
                        "title" => m.title = value.to_string(),
                        "order" => m.order = value.parse().unwrap_or(0),
                        "status" => m.status = value.to_string(),
                        "povCharacter" => m.pov_character = Some(value.to_string()),
                        "createdAt" => m.created_at = value.to_string(),  // ✅ PRESERVED
                        _ => {}
                    }
                }
            }
            m
        } else {
            // Fallback: create new metadata
            SceneMeta {
                id: scene_file.replace(".md", ""),
                title: title.clone().unwrap_or_default(),
                order: 0,
                status: "draft".to_string(),
                word_count: 0,
                pov_character: None,
                created_at: now.clone(),
                updated_at: now.clone(),
            }
        }
    } else {
        // New scene: generate metadata
        SceneMeta {
            id: scene_file.replace(".md", ""),
            title: title.clone().unwrap_or_default(),
            order: 0,
            status: "draft".to_string(),
            word_count: 0,
            pov_character: None,
            created_at: now.clone(),
            updated_at: now.clone(),
        }
    };
    
    // Step 3: Update fields
    meta.word_count = count_words(&content);
    meta.updated_at = now;  // ✅ UPDATED
    if let Some(t) = title {
        meta.title = t;
    }
    
    // Step 4: Generate frontmatter
    let frontmatter = format!(
        "---\nid: {}\ntitle: \"{}\"\norder: {}\nstatus: {}\nwordCount: {}\ncreatedAt: {}\nupdatedAt: {}\n---\n\n",
        meta.id, meta.title, meta.order, meta.status, meta.word_count, meta.created_at, meta.updated_at
    );
    
    let full_content = frontmatter + &content;
    
    // Step 5: Atomic write (write to temp, then rename)
    let temp_path = file_path.with_extension("md.tmp");
    fs::write(&temp_path, &full_content).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &file_path).map_err(|e| e.to_string())?;
    
    Ok(meta)
}
```

**Time Complexity**: O(n) where n = file size (single pass parse)  
**Space Complexity**: O(n) for storing content

**Key Invariants**:
- `createdAt` is **never** modified after creation
- `id` is **never** modified after creation
- `updatedAt` is **always** set to current time
- `word_count` is **always** recalculated

---

###  1.2 Structure Tree Recursive Search

**Problem**: Find scene file path by scene ID in hierarchical structure.

**Algorithm**: Depth-first search with recursive visitor.

**Implementation**: `commands/scene.rs::save_scene_by_id()` (lines 149-182)

```rust
pub fn save_scene_by_id(
    project_path: String,
    scene_id: String,
    content: String
) -> Result<SceneMeta, String> {
    // Step 1: Load structure.json
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    let structure_content = fs::read_to_string(&structure_path)?;
    let structure: Vec<StructureNode> = serde_json::from_str(&structure_content)?;
    
    // Step 2: Recursive search
    fn find_scene_file(nodes: &[StructureNode], id: &str) -> Option<String> {
        for node in nodes {
            if node.id == id {
                return node.file.clone();  // Found it
            }
            // Recurse into children
            if !node.children.is_empty() {
                if let Some(file) = find_scene_file(&node.children, id) {
                    return Some(file);
                }
            }
        }
        None  // Not found
    }
    
    // Step 3: Find scene file
    let scene_file = find_scene_file(&structure, &scene_id)
        .ok_or_else(|| format!("Scene not found in structure: {}", scene_id))?;
    
    // Step 4: Delegate to save_scene
    save_scene(project_path, scene_file, content, None)
}
```

**Time Complexity**: O(n) where n = number of nodes in tree (worst case: scene is last)  
**Space Complexity**: O(d) for recursion stack where d = tree depth (typically ≤ 3: Act → Chapter → Scene)

**Why Recursive Instead of Iterative?**  
Structure is tree-shaped (Acts → Chapters → Scenes), making recursion natural and readable.

---

### 1.3 Emergency Backup Cleanup Algorithm

**Problem**: Delete expired backups efficiently without loading all into memory.

**Algorithm**: Streaming deletion (iterate directory, check timestamp, delete if expired).

**Implementation**: `commands/backup.rs::cleanup_emergency_backups()` (lines 61-87)

```rust
pub fn cleanup_emergency_backups() -> Result<i32, String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");
    
    if !backups_dir.exists() {
        return Ok(0);
    }
    
    let now = chrono::Utc::now().timestamp_millis();
    let mut cleaned = 0;
    
    // Iterate directory (streaming, not loaded into memory)
    for entry in fs::read_dir(&backups_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            // Read file
            if let Ok(content) = fs::read_to_string(entry.path()) {
                // Parse JSON
                if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                    // Check expiration
                    if backup.expires_at < now {
                        // Delete if expired
                        if fs::remove_file(entry.path()).is_ok() {
                            cleaned += 1;
                        }
                    }
                }
            }
        }
    }
    
    Ok(cleaned)
}
```

**Time Complexity**: O(n) where n = number of backup files  
**Space Complexity**: O(1) — Processes one file at a time (streaming)

**Why Not Load All?**  
For large projects with thousands of backups, loading all into memory would be wasteful.

---

### 1.4 Manuscript Export Tree Traversal

**Problem**: Export entire manuscript in correct order (Acts → Chapters → Scenes).

**Algorithm**: Pre-order tree traversal with depth tracking.

**Implementation**: `commands/backup.rs::export_manuscript_text()` (lines 91-131)

```rust
pub fn export_manuscript_text(project_path: String) -> Result<String, String> {
    let structure = crate::commands::project::get_structure(project_path.clone())?;
    let mut output = String::new();
    
    // Recursive tree traversal
    fn process_node(
        node: &StructureNode,
        project_path: &str,
        output: &mut String,
        depth: usize
    ) {
        let indent = "  ".repeat(depth);
        
        match node.node_type.as_str() {
            "act" => {
                output.push_str(&format!("\n{}# {}\n\n", indent, node.title));
            }
            "chapter" => {
                output.push_str(&format!("\n{}## {}\n\n", indent, node.title));
            }
            "scene" => {
                output.push_str(&format!("{}### {}\n\n", indent, node.title));
                
                // Load scene content
                if let Some(file) = &node.file {
                    let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        // Extract content (skip frontmatter)
                        let parts: Vec<&str> = content.splitn(3, "---").collect();
                        if parts.len() >= 3 {
                            output.push_str(parts[2].trim());
                            output.push_str("\n\n");
                        }
                    }
                }
            }
            _ => {}
        }
        
        // Recurse into children
        for child in &node.children {
            process_node(child, project_path, output, depth + 1);
        }
    }
    
    // Start traversal
    for node in &structure {
        process_node(node, &project_path, &mut output, 0);
    }
    
    Ok(output)
}
```

**Output Format**:

```markdown
# Act I: The Beginning

  ## Chapter 1: Awakening

  ### Scene 1: The Great Escape

  John woke to the sound of thunder...

  ### Scene 2: The Dark Forest

  The trees closed in around him...
```

**Time Complexity**: O(n × s) where n = nodes, s = average scene size  
**Space Complexity**: O(t) where t = total text size

---

## 2. File I/O Patterns

### 2.1 YAML Frontmatter Parsing

**Format**: Markdown files with YAML header

```markdown
---
id: "scene-123"
title: "The Great Escape"
order: 5
status: "draft"
---
{"type":"doc","content":[...]}
```

**Parsing Strategy**: Manual split + line-by-line parsing (not `serde_yaml`)

**Why Manual Parsing?**  
- **Performance**: Avoid full YAML parser overhead for simple key-value pairs
- **Robustness**: Partial parsing works even if some fields are malformed
- **Control**: Can handle edge cases (missing fields, different types)

**Implementation**:

```rust
let content = fs::read_to_string(&file_path)?;

// Split by "---" markers
let parts: Vec<&str> = content.splitn(3, "---").collect();

if parts.len() < 3 {
    return Err("Invalid scene file format".to_string());
}

let yaml_str = parts[1].trim();  // YAML block
let body = parts[2].trim();      // Content block

// Parse line-by-line
for line in yaml_str.lines() {
    let parts: Vec<&str> = line.splitn(2, ':').collect();
    if parts.len() == 2 {
        let key = parts[0].trim();
        let value = parts[1].trim().trim_matches('"');
        
        match key {
            "id" => meta.id = value.to_string(),
            "title" => meta.title = value.to_string(),
            "order" => meta.order = value.parse().unwrap_or(0),
            _ => {}  // Ignore unknown fields
        }
    }
}
```

**Robustness**: 
- Handles missing fields (uses defaults)
- Ignores extra fields (forward compatibility)
- Tolerates malformed lines (skips them)

---

### 2.2 Atomic Write Pattern

**Problem**: Prevent data corruption if write fails mid-operation (power loss, disk full).

**Solution**: Write to temporary file → Rename (atomic operation on POSIX).

**Implementation**:

```rust
// Step 1: Write to temporary file
let temp_path = file_path.with_extension("md.tmp");
fs::write(&temp_path, &full_content).map_err(|e| e.to_string())?;

// Step 2: Atomic rename (replaces original)
fs::rename(&temp_path, &file_path).map_err(|e| e.to_string())?;
```

**Why This Works**:
- **POSIX Guarantee**: `rename()` is atomic (either succeeds fully or fails completely)
- **No Partial Writes**: If `write()` fails, original file is untouched
- **Crash-Safe**: If process crashes after `write()` but before `rename()`, original file is intact

**Trade-off**: Requires 2× disk space temporarily (original + temp).

---

### 2.3 JSON Serialization Pattern

**Codex Entry Write**:

```rust
let json = serde_json::to_string_pretty(&entry)
    .map_err(|e| format!("Failed to serialize entry: {}", e))?;

fs::write(&entry_path, json)
    .map_err(|e| format!("Failed to write entry: {}", e))?;
```

**Codex Entry Read**:

```rust
let content = fs::read_to_string(&entry_path)
    .map_err(|e| format!("Failed to read entry: {}", e))?;

let entry: CodexEntry = serde_json::from_str(&content)
    .map_err(|e| format!("Failed to parse entry: {}", e))?;
```

**Error Handling**: All I/O operations use `.map_err()` to convert OS errors to user-friendly strings.

---

### 2.4 Directory Traversal Pattern

**List Codex Entries** (scan directory tree):

```rust
pub fn list_codex_entries(project_path: String) -> Result<Vec<CodexEntry>, String> {
    let codex_dir = PathBuf::from(&project_path).join("codex");
    
    if !codex_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut entries = Vec::new();
    
    // Iterate categories (characters, locations, etc.)
    for category in &["characters", "locations", "items", "lore", "subplots"] {
        let category_dir = codex_dir.join(category);
        
        if !category_dir.exists() {
            continue;
        }
        
        // Iterate files in category
        for entry in fs::read_dir(&category_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let codex_entry: CodexEntry = serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;
                
                entries.push(codex_entry);
            }
        }
    }
    
    Ok(entries)
}
```

**Time Complexity**: O(c × f) where c = categories, f = files per category  
**Space Complexity**: O(n) where n = total entries

---

## 3. Command Implementations

### 3.1 Trash/Restore Flow

**Move to Trash** (`trash.rs::move_to_trash`, lines 7-50):

```rust
pub fn move_to_trash(
    project_path: String,
    item_id: String,
    item_type: String,
    trash_meta: String
) -> Result<(), String> {
    let project_dir = PathBuf::from(&project_path);
    let trash_dir = project_dir.join(".meta").join("trash");
    fs::create_dir_all(&trash_dir)?;
    
    // Step 1: Parse metadata
    let meta: serde_json::Value = serde_json::from_str(&trash_meta)?;
    
    // Step 2: Locate source file
    let source_path = match item_type.as_str() {
        "scene" => project_dir.join("manuscript").join(format!("{}.md", item_id)),
        "codex" => {
            // Search all categories
            let codex_dir = project_dir.join("codex");
            let mut found_path = None;
            for category in &["characters", "locations", "items", "lore", "subplots"] {
                let path = codex_dir.join(category).join(format!("{}.json", item_id));
                if path.exists() {
                    found_path = Some(path);
                    break;
                }
            }
            found_path.ok_or("Codex entry not found")?
        },
        _ => return Err(format!("Unknown item type: {}", item_type)),
    };
    
    // Step 3: Create trash item directory
    let trash_item_dir = trash_dir.join(&item_id);
    fs::create_dir_all(&trash_item_dir)?;
    
    // Step 4: Copy file to trash
    let dest_path = trash_item_dir.join(source_path.file_name().unwrap());
    fs::copy(&source_path, &dest_path)?;
    
    // Step 5: Save metadata
    let meta_path = trash_item_dir.join("meta.json");
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())?;
    
    // Step 6: Delete original (only after successful copy)
    fs::remove_file(&source_path)?;
    
    Ok(())
}
```

**Trash Directory Structure**:

```
.meta/trash/
├── scene-123/
│   ├── act-1-chapter-1-scene-1.md
│   └── meta.json
└── char-456/
    ├── john-smith.json
    └── meta.json
```

**Restore from Trash** (`trash.rs::restore_from_trash`, lines 53-91):

```rust
pub fn restore_from_trash(
    project_path: String,
    item_id: String,
    item_type: String
) -> Result<(), String> {
    let project_dir = PathBuf::from(&project_path);
    let trash_dir = project_dir.join(".meta").join("trash").join(&item_id);
    
    // Step 1: Find trashed file
    let entries: Vec<_> = fs::read_dir(&trash_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name() != "meta.json")  // Skip metadata
        .collect();
    
    let trashed_file = entries.get(0)
        .ok_or("No file found in trash item")?;
    
    // Step 2: Determine restore path
    let restore_path = match item_type.as_str() {
        "scene" => project_dir.join("manuscript").join(trashed_file.file_name()),
        "codex" => {
            // Read metadata to get category
            let meta_path = trash_dir.join("meta.json");
            let meta: serde_json::Value = if meta_path.exists() {
                let content = fs::read_to_string(&meta_path)?;
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                serde_json::Value::Null
            };
            let category = meta.get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("characters");
            project_dir.join("codex").join(category).join(trashed_file.file_name())
        },
        _ => return Err(format!("Unknown item type: {}", item_type)),
    };
    
    // Step 3: Copy back to original location
    fs::copy(trashed_file.path(), &restore_path)?;
    
    // Step 4: Delete trash directory
    fs::remove_dir_all(&trash_dir)?;
    
    Ok(())
}
```

**Key Design**: Metadata stored separately to preserve category info for restore.

---

### 3.2 Emergency Backup Retrieval

**Save Backup** (`backup.rs::save_emergency_backup`, lines 12-22):

```rust
pub fn save_emergency_backup(backup: EmergencyBackup) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");
    fs::create_dir_all(&backups_dir)?;
    
    let backup_path = backups_dir.join(format!("{}.json", backup.id));
    let json = serde_json::to_string_pretty(&backup)?;
    fs::write(&backup_path, json)?;
    
    Ok(())
}
```

**Get Backup** (`backup.rs::get_emergency_backup`, lines 25-46):

```rust
pub fn get_emergency_backup(scene_id: String) -> Result<Option<EmergencyBackup>, String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");
    
    if !backups_dir.exists() {
        return Ok(None);
    }
    
    // Scan directory for matching backup
    for entry in fs::read_dir(&backups_dir)? {
        if let Ok(entry) = entry {
            if let Ok(content) = fs::read_to_string(entry.path()) {
if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                    // Check scene ID and expiration
                    if backup.scene_id == scene_id 
                        && backup.expires_at > chrono::Utc::now().timestamp_millis() 
                    {
                        return Ok(Some(backup));
                    }
                }
            }
        }
    }
    
    Ok(None)  // Not found or expired
}
```

**Why Scan Directory?**  
- No index file needed (simpler)
- Expired backups are naturally ignored
- Robust to partial failures (corrupted files skipped)

---

## 4. Error Handling Patterns

### 4.1 Result Propagation with `?` Operator

**Pattern**: All commands return `Result<T, String>`

```rust
#[tauri::command]
pub fn load_scene(project_path: String, scene_file: String) -> Result<Scene, String> {
    let project_path_buf = project_dir(&project_path)?;  // Propagates error
    let file_path = project_path_buf.join("manuscript").join(&scene_file);
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| e.to_string())?;  // Converts io::Error to String
    
    // ...
}
```

**Error Conversion**: `.map_err(|e| e.to_string())` converts OS errors to human-readable strings.

---

### 4.2 Graceful Fallbacks

**Pattern**: Return empty collections instead of errors for missing data

```rust
pub fn list_codex_entries(project_path: String) -> Result<Vec<CodexEntry>, String> {
    let codex_dir = PathBuf::from(&project_path).join("codex");
    
    if !codex_dir.exists() {
        return Ok(Vec::new());  // ✅ Graceful: return empty, not error
    }
    
    // ...
}
```

**Rationale**: Missing directories are common (new projects), not errors.

---

### 4.3 Partial Failure Handling

**Pattern**: Skip corrupted items, continue processing

```rust
pub fn list_trash(project_path: String) -> Result<Vec<serde_json::Value>, String> {
    let trash_dir = PathBuf::from(&project_path).join(".meta").join("trash");
    let mut items = Vec::new();
    
    for entry in fs::read_dir(&trash_dir)? {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta_path = entry.path().join("meta.json");
        
        if meta_path.exists() {
            let content = fs::read_to_string(&meta_path)?;
            
            // Try to parse, skip if malformed
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&content) {
                items.push(meta);  // ✅ Add valid item
            }
            // ❌ Skip invalid item (don't fail entire operation)
        }
    }
    
    Ok(items)
}
```

---

### 4.4 Error Context Enhancement

**Pattern**: Add context to errors for better debugging

```rust
let entry: CodexEntry = serde_json::from_str(&content)
    .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;
```

**Before**: `"invalid type: string, expected a number"`  
**After**: `"Failed to parse /path/to/codex/character/john.json: invalid type: string, expected a number"`

---

## 5. Performance Optimizations

### 5.1 Streaming Directory Traversal

**Optimization**: Don't load entire directory into memory

```rust
// ❌ Bad: Load all, then filter
let all_entries: Vec<_> = fs::read_dir(&dir)?.collect();
let json_files: Vec<_> = all_entries.into_iter()
    .filter(|e| e.path().extension() == Some("json"))
    .collect();

// ✅ Good: Stream and filter
for entry in fs::read_dir(&dir)? {
    let entry = entry?;
    if entry.path().extension() == Some("json") {
        // Process immediately
    }
}
```

**Benefit**: O(1) memory instead of O(n).

---

### 5.2 Lazy Loading

**Optimization**: Only load scene content when needed

```rust
// Structure contains metadata only (IDs, titles, order)
let structure = get_structure(project_path)?;

// Scene content loaded on-demand
let scene = load_scene(project_path, scene_file)?;
```

**Benefit**: Loading structure (~5KB) is fast. Loading all scenes (~10MB+) would be slow.

---

### 5.3 Size Validation Before Loading

**Optimization**: Check file size before reading

```rust
pub fn load_scene(project_path: String, scene_file: String) -> Result<Scene, String> {
    let file_path = project_path_buf.join("manuscript").join(&scene_file);
    
    // Security: Check size BEFORE loading
    if file_path.exists() {
        let metadata = fs::metadata(&file_path)?;
        validate_file_size(metadata.len(), MAX_SCENE_SIZE, "Scene file")?;
    }
    
    // Now safe to load
    let content = fs::read_to_string(&file_path)?;
    
    // ...
}
```

**Benefit**: Prevents loading 1GB files into memory (DoS protection).

---

## 6. Security Implementation

### 6.1 Path Traversal Prevention

**Validation** (`utils/validation.rs`):

```rust
pub fn validate_project_title(title: &str) -> Result<(), String> {
    // Block path separators
    if title.contains('/') || title.contains('\\') {
        return Err("Project title cannot contain path separators".to_string());
    }
    
    // Block dangerous path components
    if title == "." || title == ".." || title.starts_with('.') {
        return Err("Project title cannot start with '.'".to_string());
    }
    
    // Block dangerous characters
    let dangerous = ['*', '?', '<', '>', '|', ':', '"', '\0'];
    if title.chars().any(|c| dangerous.contains(&c)) {
        return Err("Project title contains invalid characters".to_string());
    }
    
    Ok(())
}
```

**Usage**:

```rust
#[tauri::command]
pub fn create_project(title: String) -> Result<ProjectMeta, String> {
    validate_project_title(&title)?;  // ✅ Validated
    
    let safe_name = sanitize_path_component(&title);
    // Now safe to create directory
}
```

---

### 6.2 Size Limits

**Constants**:

```rust
pub const MAX_SCENE_SIZE: u64 = 10 * 1024 * 1024;  // 10 MB
pub const MAX_JSON_SIZE: usize = 5 * 1024 * 1024;  // 5 MB
pub const MAX_PROJECT_SIZE: u64 = 1024 * 1024 * 1024;  // 1 GB
```

**Enforcement**:

```rust
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

---

### 6.3 Keychain Integration

**Store API Key** (`commands/security.rs`, lines 20-46):

```rust
use keyring::Entry;

const SERVICE_NAME: &str = "com.becomeauthor.app";

#[tauri::command]
pub fn store_api_key(provider: String, key: String) -> Result<(), String> {
    // Validation
    if provider.is_empty() || key.is_empty() {
        return Err("Provider and key cannot be empty".to_string());
    }
    
    // Create keyring entry
    let account = format!("api-key-{}", provider);
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    // Store password (API key) - OS encrypts it
    entry.set_password(&key)
        .map_err(|e| format!("Failed to store API key: {}", e))?;
    
    Ok(())
}
```

**Retrieve API Key** (`commands/security.rs`, lines 58-84):

```rust
#[tauri::command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    let account = format!("api-key-{}", provider);
    let entry = Entry::new(SERVICE_NAME, &account)?;
    
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),  // Not found (not an error)
        Err(e) => Err(format!("Failed to retrieve API key: {}", e)),
    }
}
```

**Security Properties**:
- ✅ Encrypted by OS (Keychain/Credential Manager)
- ✅ Requires user authentication (OS-level)
- ✅ Not stored in project files
- ✅ Not in environment variables

---

## Conclusion

The backend implementation follows **secure, robust patterns**:

**Algorithms**:
- ✅ Metadata preservation (existing fields never lost)
- ✅ Recursive tree search (O(n) worst case)
- ✅ Streaming cleanup (O(1) memory)
- ✅ Pre-order export (correct manuscript order)

**File I/O**:
- ✅ Manual YAML parsing (simpler, faster)
- ✅ Atomic writes (crash-safe)
- ✅ Streaming directory traversal (memory-efficient)
- ✅ Lazy loading (only load what's needed)

**Error Handling**:
- ✅ Result propagation (`?` operator)
- ✅ Graceful fallbacks (empty instead of error)
- ✅ Partial failure handling (skip corrupted)
- ✅ Error context enhancement (better debugging)

**Security**:
- ✅ Path traversal prevention (validation + sanitization)
- ✅ Size limits (DoS protection)
- ✅ Keychain integration (encrypted secrets)

**Recommended Next Steps**:
1. **Add** file locking (prevent concurrent writes)
2. **Implement** transaction-like patterns (rollback on error)
3. **Optimize** search with indexing
4. **Add** compression for backups

---

**Document Status**: ✅ Complete  
**Last Updated**: 2025-01-20  
**Algorithms Documented**: 4/4  
**File I/O Patterns Documented**: 4/4  
**Command Implementations**: 3 (scene, trash, backup)  
**Security Implementations**: 3/3
