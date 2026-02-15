// Project commands

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use crate::models::{ProjectMeta, StructureNode};
use crate::utils::{get_app_dir, get_projects_dir, slugify, validate_project_creation, timestamp};

// ============== Recent Projects ==============

/// Represents a recently opened project for the dashboard
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub path: String,
    pub title: String,
    #[serde(alias = "last_opened")]
    pub last_opened: i64,
}

/// Get the path to the recent projects file
fn get_recent_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    Ok(app_dir.join("recent.json"))
}

/// Get the path to the project registry file
fn get_project_registry_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    Ok(app_dir.join("project_registry.json"))
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct RegistryEntry {
    path: String,
    title: Option<String>,
    last_seen: i64,
}

fn read_project_registry() -> Result<Vec<RegistryEntry>, String> {
    let registry_path = get_project_registry_path()?;
    if !registry_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&registry_path)
        .map_err(|e| format!("Failed to read project_registry.json: {}", e))?;
    Ok(serde_json::from_str(&content).unwrap_or_default())
}

fn write_project_registry(entries: &[RegistryEntry]) -> Result<(), String> {
    let registry_path = get_project_registry_path()?;
    let json = serde_json::to_string_pretty(entries)
        .map_err(|e| format!("Failed to serialize project registry: {}", e))?;
    fs::write(&registry_path, json)
        .map_err(|e| format!("Failed to write project_registry.json: {}", e))?;
    Ok(())
}

pub(crate) fn register_project_path(project_path: String, title: Option<String>) -> Result<(), String> {
    let mut entries = read_project_registry()?;
    entries.retain(|e| e.path != project_path);
    entries.insert(
        0,
        RegistryEntry {
            path: project_path,
            title,
            last_seen: timestamp::now_millis(),
        },
    );
    write_project_registry(&entries)
}

fn get_projects_trash_dir() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    Ok(app_dir.join("Trash"))
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrashedProject {
    pub id: String,
    pub title: String,
    pub original_path: String,
    pub trash_path: String,
    pub deleted_at: i64,
}

pub(crate) fn unregister_project_path(project_path: &str) -> Result<(), String> {
    let mut entries = read_project_registry()?;
    entries.retain(|e| e.path != project_path);
    write_project_registry(&entries)
}

/// List recently opened projects (auto-prunes old/invalid entries)
#[tauri::command]
pub fn list_recent_projects() -> Result<Vec<RecentProject>, String> {
    let recent_path = get_recent_path()?;
    
    if !recent_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&recent_path)
        .map_err(|e| format!("Failed to read recent.json: {}", e))?;
    
    let mut projects: Vec<RecentProject> = serde_json::from_str(&content)
        .unwrap_or_default();
    
    // Prune entries older than 30 days
    let cutoff = timestamp::now_millis() - (30 * 24 * 60 * 60 * 1000);
    projects.retain(|p| p.last_opened > cutoff);
    
    // Validate paths exist (remove invalid entries)
    projects.retain(|p| PathBuf::from(&p.path).join(".meta/project.json").exists());
    
    // Sort by most recent first
    projects.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    
    // Limit to 20
    projects.truncate(20);
    
    // Save pruned list back
    let json = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize recent: {}", e))?;
    fs::write(&recent_path, json)
        .map_err(|e| format!("Failed to write recent.json: {}", e))?;
    
    Ok(projects)
}

/// Add a project to the recent list
#[tauri::command]
pub fn add_to_recent(project_path: String, title: String) -> Result<(), String> {
    let recent_path = get_recent_path()?;
    let registry_path = project_path.clone();
    let registry_title = title.clone();
    
    let mut projects: Vec<RecentProject> = if recent_path.exists() {
        let content = fs::read_to_string(&recent_path)
            .map_err(|e| format!("Failed to read recent.json: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    // Remove if already exists (will re-add at top)
    projects.retain(|p| p.path != project_path);
    
    // Add at start (most recent)
    projects.insert(0, RecentProject {
        path: project_path,
        title,
        last_opened: timestamp::now_millis(),
    });
    
    // Limit to 20
    projects.truncate(20);
    
    // Save
    let json = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize recent: {}", e))?;
    fs::write(&recent_path, json)
        .map_err(|e| format!("Failed to write recent.json: {}", e))?;

    // Keep registry in sync so projects remain discoverable beyond recent-window limits.
    register_project_path(registry_path, Some(registry_title))?;
    
    Ok(())
}

/// Remove a project from the recent list
#[tauri::command]
pub fn remove_from_recent(project_path: String) -> Result<(), String> {
    let recent_path = get_recent_path()?;
    
    if !recent_path.exists() {
        return Ok(());
    }
    
    let content = fs::read_to_string(&recent_path)
        .map_err(|e| format!("Failed to read recent.json: {}", e))?;
    let mut projects: Vec<RecentProject> = serde_json::from_str(&content)
        .unwrap_or_default();
    
    projects.retain(|p| p.path != project_path);
    
    let json = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize recent: {}", e))?;
    fs::write(&recent_path, json)
        .map_err(|e| format!("Failed to write recent.json: {}", e))?;
    
    Ok(())
}

/// Open a project by path (validates and adds to recent)
#[tauri::command]
pub fn open_project(project_path: String) -> Result<ProjectMeta, String> {
    let path = PathBuf::from(&project_path);
    let meta_path = path.join(".meta/project.json");
    
    if !meta_path.exists() {
        return Err(format!("Not a valid project folder: {}", project_path));
    }
    
    let content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read project.json: {}", e))?;
    
    let project: ProjectMeta = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project.json: {}", e))?;
    
    // Add to recent list
    add_to_recent(project_path, project.title.clone())?;
    
    Ok(project)
}

// ============== Legacy Commands (kept for compatibility) ==============

#[tauri::command]
pub fn get_projects_path() -> Result<String, String> {
    let dir = get_projects_dir()?;
    Ok(dir.to_string_lossy().to_string())
}

/// List projects from recent list (simplified from registry-based approach)
#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectMeta>, String> {
    let mut candidate_paths: HashSet<String> = HashSet::new();

    // 1) Registry-backed paths (persistent across "recent" pruning)
    for entry in read_project_registry()? {
        candidate_paths.insert(entry.path);
    }

    // 2) Recent paths (still useful for externally-opened projects)
    for recent in list_recent_projects()? {
        candidate_paths.insert(recent.path);
    }

    // 3) Default app projects directory scan
    let projects_dir = get_projects_dir()?;
    if projects_dir.exists() {
        for entry in fs::read_dir(&projects_dir).map_err(|e| e.to_string())? {
            let Ok(entry) = entry else { continue };
            let path = entry.path();
            if path.is_dir() && path.join(".meta/project.json").exists() {
                candidate_paths.insert(path.to_string_lossy().to_string());
            }
        }
    }

    let mut projects = Vec::new();
    let mut still_valid_registry_entries: Vec<RegistryEntry> = Vec::new();

    for project_path in candidate_paths {
        let meta_path = PathBuf::from(&project_path).join(".meta/project.json");
        if let Ok(content) = fs::read_to_string(&meta_path) {
            if let Ok(project) = serde_json::from_str::<ProjectMeta>(&content) {
                still_valid_registry_entries.push(RegistryEntry {
                    path: project.path.clone(),
                    title: Some(project.title.clone()),
                    last_seen: timestamp::now_millis(),
                });
                projects.push(project);
            }
        }
    }

    // Save a pruned/merged registry so stale entries do not accumulate.
    // Sort by most recently seen descending.
    still_valid_registry_entries.sort_by(|a, b| b.last_seen.cmp(&a.last_seen));
    write_project_registry(&still_valid_registry_entries)?;

    // Sort by updated_at desc for deterministic dashboard ordering.
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(projects)
}

/// Helper function to check if a book number already exists in a series
/// 
/// # Arguments
/// * `series_id` - The series ID to check within
/// * `series_index` - The book number to check (e.g., "Book 1")
/// * `exclude_project_id` - Optional project ID to exclude from check (for updates)
/// 
/// # Returns
/// * Ok(()) if the book number is unique
/// * Err(String) with a descriptive message if duplicate found
fn check_duplicate_book_number(
    series_id: &str, 
    series_index: &str,
    exclude_project_id: Option<&str>
) -> Result<(), String> {
    // Get all projects
    let all_projects = list_projects()?;
    
    // Check if any other project in the same series has the same book number
    for project in all_projects {
        // Skip if this is the project being updated
        if let Some(exclude_id) = exclude_project_id {
            if project.id == exclude_id {
                continue;
            }
        }
        
        // Check for duplicate
        if project.series_id == series_id && project.series_index == series_index {
            return Err(format!(
                "Book number '{}' already exists in this series (used by '{}')",
                series_index, project.title
            ));
        }
    }
    
    Ok(())
}

#[tauri::command]
pub fn create_project(
    title: String, 
    author: String, 
    custom_path: String,
    series_id: String,
    series_index: String,
) -> Result<ProjectMeta, String> {
    // VALIDATION: Validate project title and author
    validate_project_creation(&title, Some(&author))?;
    
    // Validate series_id is provided
    if series_id.is_empty() {
        return Err("Series ID is required. All projects must belong to a series.".to_string());
    }
    
    // CHECK FOR DUPLICATE: Ensure book number is unique within the series
    check_duplicate_book_number(&series_id, &series_index, None)?;
    
    // User must provide custom path - no default fallback
    let base_dir = PathBuf::from(&custom_path);
    
    // Validate the custom path
    if !base_dir.exists() {
        return Err(format!("Directory does not exist: {}", custom_path));
    }
    
    let slug = slugify(&title);
    let project_dir = base_dir.join(&slug);

    if project_dir.exists() {
        return Err(format!("Project '{}' already exists at this location", title));
    }

    // Create directory structure (NO codex folder - codex is at series level)
    fs::create_dir_all(project_dir.join(".meta/chat/messages")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("manuscript")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("snippets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("exports")).map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = timestamp::now_millis();

    let project = ProjectMeta {
        id,
        title,
        author,
        description: String::new(),
        archived: false,
        language: None,
        cover_image: None,
        series_id,
        series_index,
        path: project_dir.to_string_lossy().to_string(),
        created_at: now,
        updated_at: now,
    };

    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(project_dir.join(".meta/project.json"), &json).map_err(|e| e.to_string())?;
    fs::write(project_dir.join(".meta/structure.json"), "[]").map_err(|e| e.to_string())?;

    // Note: Built-in templates are now seeded at series level, not project level
    // seed_built_in_data is no longer called for projects

    // Add to recent projects list
    let project_path_str = project_dir.to_string_lossy().to_string();
    add_to_recent(project_path_str, project.title.clone())?;

    Ok(project)
}

#[tauri::command]
pub fn delete_project(project_path: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    if !path.exists() {
        return Err("Project not found".to_string());
    }
    
    let trash_dir = get_projects_trash_dir()?;
    fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;
    
    let folder_name = path.file_name()
        .ok_or("Invalid project path")?
        .to_string_lossy()
        .to_string();
    
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let trash_path = trash_dir.join(format!("{}_{}", folder_name, timestamp));
    
    fs::rename(&path, &trash_path).map_err(|e| e.to_string())?;
    
    // Remove from recent projects list
    remove_from_recent(project_path)?;
    unregister_project_path(path.to_string_lossy().as_ref())?;
    
    Ok(())
}

#[tauri::command]
pub fn list_project_trash() -> Result<Vec<TrashedProject>, String> {
    let trash_dir = get_projects_trash_dir()?;
    if !trash_dir.exists() {
        return Ok(Vec::new());
    }

    let mut trashed = Vec::new();

    for entry in fs::read_dir(&trash_dir).map_err(|e| e.to_string())? {
        let entry = match entry {
            Ok(v) => v,
            Err(_) => continue,
        };
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let meta_path = path.join(".meta/project.json");
        let content = match fs::read_to_string(&meta_path) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let project_meta: ProjectMeta = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let folder_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_string();
        let deleted_at = if folder_name.len() >= 15 {
            let suffix = &folder_name[folder_name.len() - 15..];
            chrono::NaiveDateTime::parse_from_str(suffix, "%Y%m%d_%H%M%S")
                .ok()
                .map(|naive| naive.and_utc().timestamp_millis())
                .unwrap_or(project_meta.updated_at)
        } else {
            project_meta.updated_at
        };

        trashed.push(TrashedProject {
            id: project_meta.id.clone(),
            title: project_meta.title.clone(),
            original_path: project_meta.path.clone(),
            trash_path: path.to_string_lossy().to_string(),
            deleted_at,
        });
    }

    trashed.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    Ok(trashed)
}

#[tauri::command]
pub fn restore_trashed_project(trash_path: String) -> Result<ProjectMeta, String> {
    let source = PathBuf::from(&trash_path);
    if !source.exists() || !source.is_dir() {
        return Err("Trashed project not found".to_string());
    }

    let meta_path = source.join(".meta/project.json");
    let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
    let mut project: ProjectMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let preferred_target = PathBuf::from(&project.path);
    let mut target = preferred_target.clone();

    if target.exists() {
        let parent = preferred_target
            .parent()
            .ok_or("Invalid original project path")?
            .to_path_buf();
        let base_name = preferred_target
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or("Invalid original project folder name")?;
        let restored_name = format!(
            "{}_restored_{}",
            base_name,
            chrono::Utc::now().format("%Y%m%d_%H%M%S")
        );
        target = parent.join(restored_name);
    }

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::rename(&source, &target).map_err(|e| e.to_string())?;

    project.path = target.to_string_lossy().to_string();
    project.updated_at = timestamp::now_millis();
    let updated_json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(target.join(".meta/project.json"), updated_json).map_err(|e| e.to_string())?;

    add_to_recent(project.path.clone(), project.title.clone())?;
    register_project_path(project.path.clone(), Some(project.title.clone()))?;

    Ok(project)
}

#[tauri::command]
pub fn permanently_delete_trashed_project(trash_path: String) -> Result<(), String> {
    let path = PathBuf::from(trash_path);
    if path.exists() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Deserialize)]
pub struct ProjectUpdates {
    pub title: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
    pub archived: Option<bool>,
    pub language: Option<String>,
    pub cover_image: Option<String>,
    pub series_id: Option<String>,
    pub series_index: Option<String>,
}

#[tauri::command]
pub fn update_project(project_path: String, updates: ProjectUpdates) -> Result<ProjectMeta, String> {
    let meta_path = PathBuf::from(&project_path).join(".meta/project.json");
    if !meta_path.exists() {
        return Err("Project not found".to_string());
    }
    
    let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
    let mut project: ProjectMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    // Extract series_id and series_index for duplicate check
    let new_series_id = updates.series_id.as_ref().unwrap_or(&project.series_id);
    let new_series_index = updates.series_index.as_ref().unwrap_or(&project.series_index);
    
    // CHECK FOR DUPLICATE: If either series_id or series_index is being changed
    if updates.series_id.is_some() || updates.series_index.is_some() {
        check_duplicate_book_number(new_series_id, new_series_index, Some(&project.id))?;
    }
    
    if let Some(title) = updates.title {
        project.title = title;
    }
    if let Some(author) = updates.author {
        project.author = author;
    }
    if let Some(description) = updates.description {
        project.description = description;
    }
    if let Some(archived) = updates.archived {
        project.archived = archived;
    }
    if let Some(language) = updates.language {
        project.language = Some(language);
    }
    if let Some(cover_image) = updates.cover_image {
        project.cover_image = Some(cover_image);
    }
    if let Some(series_id) = updates.series_id {
        project.series_id = series_id;
    }
    if let Some(series_index) = updates.series_index {
        project.series_index = series_index;
    }
    
    project.updated_at = timestamp::now_millis();
    
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&meta_path, json).map_err(|e| e.to_string())?;
    
    Ok(project)
}

#[tauri::command]
pub fn archive_project(project_path: String) -> Result<ProjectMeta, String> {
    update_project(project_path, ProjectUpdates {
        title: None,
        author: None,
        description: None,
        archived: Some(true),
        language: None,
        cover_image: None,
        series_id: None,
        series_index: None,
    })
}

#[tauri::command]
pub fn get_structure(project_path: String) -> Result<Vec<StructureNode>, String> {
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    
    if !structure_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&structure_path).map_err(|e| e.to_string())?;
    let structure: Vec<StructureNode> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    Ok(structure)
}

#[tauri::command]
pub fn save_structure(project_path: String, structure: Vec<StructureNode>) -> Result<(), String> {
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    let json = serde_json::to_string_pretty(&structure).map_err(|e| e.to_string())?;
    fs::write(&structure_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_node(
    project_path: String,
    node_type: String,
    title: String,
    parent_id: Option<String>,
) -> Result<StructureNode, String> {
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    let content = fs::read_to_string(&structure_path).unwrap_or_else(|_| "[]".to_string());
    let mut structure: Vec<StructureNode> = serde_json::from_str(&content).unwrap_or_default();
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = timestamp::now_millis();
    let now_rfc3339 = timestamp::to_rfc3339(now);
    
    fn count_children(nodes: &[StructureNode], parent_id: &Option<String>) -> i32 {
        match parent_id {
            None => nodes.len() as i32,
            Some(pid) => {
                fn find_parent(nodes: &[StructureNode], pid: &str) -> Option<i32> {
                    for node in nodes {
                        if node.id == pid {
                            return Some(node.children.len() as i32);
                        }
                        if let Some(count) = find_parent(&node.children, pid) {
                            return Some(count);
                        }
                    }
                    None
                }
                find_parent(nodes, pid).unwrap_or(0)
            }
        }
    }
    
    let order = count_children(&structure, &parent_id);
    
    let mut new_node = StructureNode {
        id: id.clone(),
        node_type: node_type.clone(),
        title: title.clone(),
        order,
        children: Vec::new(),
        file: None,
    };
    
    // If scene, create the markdown file
    if node_type == "scene" {
        let file_name = format!("{}.md", id);
        let file_path = PathBuf::from(&project_path).join("manuscript").join(&file_name);
        
        let scene_content = format!(
            "---\nid: {}\ntitle: \"{}\"\norder: {}\nstatus: draft\nwordCount: 0\npov: null\nsubtitle: null\nlabels: []\nexcludeFromAI: false\nsummary: \"\"\narchived: false\ncreatedAt: {}\nupdatedAt: {}\n---\n\n",
            id, title, order, now_rfc3339, now_rfc3339
        );
        fs::write(&file_path, scene_content).map_err(|e| e.to_string())?;
        new_node.file = Some(file_name);
    }
    
    // Add to structure
    fn add_to_parent(nodes: &mut Vec<StructureNode>, parent_id: &Option<String>, new_node: StructureNode) -> bool {
        match parent_id {
            None => {
                nodes.push(new_node);
                true
            }
            Some(pid) => {
                for node in nodes.iter_mut() {
                    if node.id == *pid {
                        node.children.push(new_node);
                        return true;
                    }
                    if add_to_parent(&mut node.children, parent_id, new_node.clone()) {
                        return true;
                    }
                }
                false
            }
        }
    }
    
    add_to_parent(&mut structure, &parent_id, new_node.clone());
    
    let json = serde_json::to_string_pretty(&structure).map_err(|e| e.to_string())?;
    fs::write(&structure_path, json).map_err(|e| e.to_string())?;
    
    Ok(new_node)
}

#[tauri::command]
pub fn rename_node(project_path: String, node_id: String, new_title: String) -> Result<(), String> {
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    let content = fs::read_to_string(&structure_path).map_err(|e| e.to_string())?;
    let mut structure: Vec<StructureNode> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    fn rename_in_tree(nodes: &mut [StructureNode], node_id: &str, new_title: &str) -> bool {
        for node in nodes.iter_mut() {
            if node.id == node_id {
                node.title = new_title.to_string();
                return true;
            }
            if rename_in_tree(&mut node.children, node_id, new_title) {
                return true;
            }
        }
        false
    }
    
    rename_in_tree(&mut structure, &node_id, &new_title);
    
    let json = serde_json::to_string_pretty(&structure).map_err(|e| e.to_string())?;
    fs::write(&structure_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_node(project_path: String, node_id: String) -> Result<(), String> {
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    let content = fs::read_to_string(&structure_path).map_err(|e| e.to_string())?;
    let mut structure: Vec<StructureNode> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    fn collect_scene_files(node: &StructureNode, files: &mut Vec<String>) {
        if let Some(ref file) = node.file {
            files.push(file.clone());
        }
        for child in &node.children {
            collect_scene_files(child, files);
        }
    }
    
    fn delete_from_tree(nodes: &mut Vec<StructureNode>, node_id: &str, files: &mut Vec<String>) -> bool {
        if let Some(pos) = nodes.iter().position(|n| n.id == node_id) {
            collect_scene_files(&nodes[pos], files);
            nodes.remove(pos);
            return true;
        }
        for node in nodes.iter_mut() {
            if delete_from_tree(&mut node.children, node_id, files) {
                return true;
            }
        }
        false
    }
    
    let mut files_to_delete = Vec::new();
    delete_from_tree(&mut structure, &node_id, &mut files_to_delete);
    
    // Delete scene files
    for file in files_to_delete {
        let file_path = PathBuf::from(&project_path).join("manuscript").join(&file);
        if file_path.exists() {
            let _ = fs::remove_file(&file_path);
        }
    }
    
    let json = serde_json::to_string_pretty(&structure).map_err(|e| e.to_string())?;
    fs::write(&structure_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}
