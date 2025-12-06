// Backup and export commands

use std::fs;
use std::path::PathBuf;

use crate::models::{ProjectMeta, EmergencyBackup, StructureNode};
use crate::utils::{get_app_dir, get_projects_dir, slugify};
use crate::commands::seed::seed_built_in_data;

// Emergency Backup Commands
#[tauri::command]
pub fn save_emergency_backup(backup: EmergencyBackup) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
    
    let backup_path = backups_dir.join(format!("{}.json", backup.id));
    let json = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;
    fs::write(&backup_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn get_emergency_backup(scene_id: String) -> Result<Option<EmergencyBackup>, String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");
    
    if !backups_dir.exists() {
        return Ok(None);
    }
    
    for entry in fs::read_dir(&backups_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                    if backup.scene_id == scene_id && backup.expires_at > chrono::Utc::now().timestamp_millis() {
                        return Ok(Some(backup));
                    }
                }
            }
        }
    }
    
    Ok(None)
}

#[tauri::command]
pub fn delete_emergency_backup(backup_id: String) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    let backup_path = app_dir.join(".emergency_backups").join(format!("{}.json", backup_id));
    
    if backup_path.exists() {
        fs::remove_file(&backup_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn cleanup_emergency_backups() -> Result<i32, String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");
    
    if !backups_dir.exists() {
        return Ok(0);
    }
    
    let now = chrono::Utc::now().timestamp_millis();
    let mut cleaned = 0;
    
    for entry in fs::read_dir(&backups_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                    if backup.expires_at < now {
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

// Export Commands
#[tauri::command]
pub fn export_manuscript_text(project_path: String) -> Result<String, String> {
    let structure = crate::commands::project::get_structure(project_path.clone())?;
    let mut output = String::new();
    
    fn process_node(node: &StructureNode, project_path: &str, output: &mut String, depth: usize) {
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
                if let Some(file) = &node.file {
                    let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                    if let Ok(content) = fs::read_to_string(&file_path) {
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
        
        for child in &node.children {
            process_node(child, project_path, output, depth + 1);
        }
    }
    
    for node in &structure {
        process_node(node, &project_path, &mut output, 0);
    }
    
    Ok(output)
}

#[tauri::command]
pub fn export_project_backup(project_path: String, output_path: Option<String>) -> Result<String, String> {
    let project_dir = PathBuf::from(&project_path);
    let meta_path = project_dir.join(".meta/project.json");
    
    if !meta_path.exists() {
        return Err("Project not found".to_string());
    }
    
    let project: ProjectMeta = {
        let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    };
    
    let structure = crate::commands::project::get_structure(project_path.clone())?;
    let codex = crate::commands::codex::list_codex_entries(project_path.clone())?;
    let snippets = crate::commands::snippet::list_snippets(project_path.clone())?;
    
    let backup = serde_json::json!({
        "version": 1,
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "project": project,
        "nodes": structure,
        "codex": codex,
        "snippets": snippets
    });
    
    let exports_dir = project_dir.join("exports");
    fs::create_dir_all(&exports_dir).map_err(|e| e.to_string())?;
    
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("{}_backup_{}.json", slugify(&project.title), timestamp);
    
    let final_path = output_path
        .map(PathBuf::from)
        .unwrap_or_else(|| exports_dir.join(&filename));
    
    let json = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;
    fs::write(&final_path, json).map_err(|e| e.to_string())?;
    
    Ok(final_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_project_backup(backup_json: String) -> Result<ProjectMeta, String> {
    let backup: serde_json::Value = serde_json::from_str(&backup_json)
        .map_err(|e| format!("Invalid backup JSON: {}", e))?;
    
    let project_data = backup.get("project")
        .ok_or("Missing 'project' field in backup")?;
    
    let title = project_data.get("title")
        .and_then(|v| v.as_str())
        .ok_or("Missing project title")?;
    
    let author = project_data.get("author")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown");
    
    let description = project_data.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    let projects_dir = get_projects_dir()?;
    let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S");
    let slug = format!("{}_{}", slugify(title), timestamp);
    let project_dir = projects_dir.join(&slug);
    
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
    
    let new_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    let project = ProjectMeta {
        id: new_id.clone(),
        title: title.to_string(),
        author: author.to_string(),
        description: description.to_string(),
        archived: false,
        path: project_dir.to_string_lossy().to_string(),
        created_at: now.clone(),
        updated_at: now,
    };
    
    let project_json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(project_dir.join(".meta/project.json"), &project_json).map_err(|e| e.to_string())?;
    
    // Import nodes
    if let Some(nodes) = backup.get("nodes") {
        let mut nodes_array = nodes.as_array().cloned().unwrap_or_default();
        for node in nodes_array.iter_mut() {
            if let Some(obj) = node.as_object_mut() {
                obj.insert("projectId".to_string(), serde_json::Value::String(new_id.clone()));
            }
        }
        let structure_json = serde_json::to_string_pretty(&nodes_array).map_err(|e| e.to_string())?;
        fs::write(project_dir.join(".meta/structure.json"), structure_json).map_err(|e| e.to_string())?;
    } else {
        fs::write(project_dir.join(".meta/structure.json"), "[]").map_err(|e| e.to_string())?;
    }
    
    // Import codex
    if let Some(codex) = backup.get("codex").and_then(|v| v.as_array()) {
        for entry in codex {
            if let (Some(id), Some(category)) = (
                entry.get("id").and_then(|v| v.as_str()),
                entry.get("category").and_then(|v| v.as_str())
            ) {
                let mut entry_clone = entry.clone();
                if let Some(obj) = entry_clone.as_object_mut() {
                    obj.insert("projectId".to_string(), serde_json::Value::String(new_id.clone()));
                }
                let entry_path = project_dir.join("codex").join(category).join(format!("{}.json", id));
                fs::create_dir_all(entry_path.parent().unwrap()).map_err(|e| e.to_string())?;
                let json = serde_json::to_string_pretty(&entry_clone).map_err(|e| e.to_string())?;
                fs::write(entry_path, json).map_err(|e| e.to_string())?;
            }
        }
    }
    
    // Import snippets
    if let Some(snippets) = backup.get("snippets").and_then(|v| v.as_array()) {
        for snippet in snippets {
            if let Some(id) = snippet.get("id").and_then(|v| v.as_str()) {
                let mut snippet_clone = snippet.clone();
                if let Some(obj) = snippet_clone.as_object_mut() {
                    obj.insert("projectId".to_string(), serde_json::Value::String(new_id.clone()));
                }
                let snippet_path = project_dir.join("snippets").join(format!("{}.json", id));
                let json = serde_json::to_string_pretty(&snippet_clone).map_err(|e| e.to_string())?;
                fs::write(snippet_path, json).map_err(|e| e.to_string())?;
            }
        }
    }
    
    seed_built_in_data(&project_dir)?;
    
    Ok(project)
}
