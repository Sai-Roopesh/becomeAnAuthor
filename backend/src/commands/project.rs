// Project commands

use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

use crate::models::{ProjectMeta, StructureNode};
use crate::utils::{get_app_dir, get_projects_dir, slugify};
use crate::commands::seed::seed_built_in_data;

#[tauri::command]
pub fn get_projects_path() -> Result<String, String> {
    let dir = get_projects_dir()?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectMeta>, String> {
    let app_dir = get_app_dir()?;
    let registry_path = app_dir.join("project_registry.json");
    
    // Read from registry file (tracks all project locations)
    let project_paths: Vec<String> = if registry_path.exists() {
        let content = fs::read_to_string(&registry_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        // If no registry, scan default directory for backward compatibility
        let projects_dir = get_projects_dir()?;
        let mut paths = Vec::new();
        
        if let Ok(entries) = fs::read_dir(&projects_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() && path.join(".meta/project.json").exists() {
                    paths.push(path.to_string_lossy().to_string());
                }
            }
        }
        paths
    };
    
    // Load all projects from registry
    let mut projects = Vec::new();
    for path_str in project_paths {
        let path = PathBuf::from(&path_str);
        let meta_path = path.join(".meta/project.json");
        
        if meta_path.exists() {
            if let Ok(content) = fs::read_to_string(&meta_path) {
                if let Ok(project) = serde_json::from_str::<ProjectMeta>(&content) {
                    projects.push(project);
                }
            }
        }
    }

    Ok(projects)
}

#[tauri::command]
pub fn create_project(title: String, author: String, custom_path: String) -> Result<ProjectMeta, String> {
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

    // Create directory structure
    fs::create_dir_all(project_dir.join(".meta/chat/messages")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("manuscript")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("codex/characters")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("codex/locations")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("codex/items")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("codex/lore")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("codex/subplots")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("snippets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("analyses")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("exports")).map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let project = ProjectMeta {
        id,
        title,
        author,
        description: String::new(),
        archived: false,
        path: project_dir.to_string_lossy().to_string(),
        created_at: now.clone(),
        updated_at: now,
    };

    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(project_dir.join(".meta/project.json"), &json).map_err(|e| e.to_string())?;
    fs::write(project_dir.join(".meta/structure.json"), "[]").map_err(|e| e.to_string())?;

    // Seed built-in templates and relation types
    seed_built_in_data(&project_dir)?;

    // Add to project registry so it can be discovered
    let app_dir = get_app_dir()?;
    let registry_path = app_dir.join("project_registry.json");
    
    // Read existing registry
    let mut project_paths: Vec<String> = if registry_path.exists() {
        let content = fs::read_to_string(&registry_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    // Add new project path
    let project_path_str = project_dir.to_string_lossy().to_string();
    if !project_paths.contains(&project_path_str) {
        project_paths.push(project_path_str);
    }
    
    // Write back to registry
    let registry_json = serde_json::to_string_pretty(&project_paths).map_err(|e| e.to_string())?;
    fs::write(&registry_path, registry_json).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn delete_project(project_path: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    if !path.exists() {
        return Err("Project not found".to_string());
    }
    
    let app_dir = get_app_dir()?;
    let trash_dir = app_dir.join("Trash");
    fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;
    
    let folder_name = path.file_name()
        .ok_or("Invalid project path")?
        .to_string_lossy()
        .to_string();
    
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let trash_path = trash_dir.join(format!("{}_{}", folder_name, timestamp));
    
    fs::rename(&path, &trash_path).map_err(|e| e.to_string())?;
    
    // Remove from registry
    let registry_path = app_dir.join("project_registry.json");
    if registry_path.exists() {
        let content = fs::read_to_string(&registry_path).map_err(|e| e.to_string())?;
        let mut project_paths: Vec<String> = serde_json::from_str(&content).unwrap_or_default();
        
        // Remove this project
        project_paths.retain(|p| p != &project_path);
        
        // Write back
        let registry_json = serde_json::to_string_pretty(&project_paths).map_err(|e| e.to_string())?;
        fs::write(&registry_path, registry_json).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[derive(Deserialize)]
pub struct ProjectUpdates {
    pub title: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
    pub archived: Option<bool>,
}

#[tauri::command]
pub fn update_project(project_path: String, updates: ProjectUpdates) -> Result<ProjectMeta, String> {
    let meta_path = PathBuf::from(&project_path).join(".meta/project.json");
    if !meta_path.exists() {
        return Err("Project not found".to_string());
    }
    
    let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
    let mut project: ProjectMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
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
    
    project.updated_at = chrono::Utc::now().to_rfc3339();
    
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
    let now = chrono::Utc::now().to_rfc3339();
    
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
            "---\nid: {}\ntitle: \"{}\"\norder: {}\nstatus: draft\nwordCount: 0\ncreatedAt: {}\nupdatedAt: {}\n---\n\n",
            id, title, order, now, now
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
    
    fn rename_in_tree(nodes: &mut Vec<StructureNode>, node_id: &str, new_title: &str) -> bool {
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
