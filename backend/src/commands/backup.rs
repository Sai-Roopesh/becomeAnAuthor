// Backup and export commands

use std::fs;
use std::path::PathBuf;

use crate::models::{ProjectMeta, EmergencyBackup, StructureNode};
use crate::utils::{get_app_dir, get_projects_dir, slugify, timestamp};
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

/// Extract plain text from Tiptap JSON content
fn extract_text_from_tiptap(content: &serde_json::Value) -> String {
    let mut result = String::new();
    
    if let Some(content_array) = content.get("content").and_then(|c| c.as_array()) {
        for node in content_array {
            extract_text_recursive(node, &mut result);
        }
    }
    
    result
}

fn extract_text_recursive(node: &serde_json::Value, result: &mut String) {
    // Handle text nodes
    if let Some(text) = node.get("text").and_then(|t| t.as_str()) {
        result.push_str(text);
    }
    
    // Handle paragraph nodes - add newline after
    if let Some(node_type) = node.get("type").and_then(|t| t.as_str()) {
        if node_type == "paragraph" {
            // Process children first
            if let Some(content) = node.get("content").and_then(|c| c.as_array()) {
                for child in content {
                    extract_text_recursive(child, result);
                }
            }
            result.push_str("\n\n");
            return;
        }
    }
    
    // Recurse into children
    if let Some(content) = node.get("content").and_then(|c| c.as_array()) {
        for child in content {
            extract_text_recursive(child, result);
        }
    }
}

/// Export manuscript as DOCX document
#[tauri::command]
pub fn export_manuscript_docx(project_path: String, output_path: String) -> Result<String, String> {
    use docx_rs::*;
    
    let structure = crate::commands::project::get_structure(project_path.clone())?;
    let mut docx = Docx::new();
    
    fn add_node_to_docx(node: &StructureNode, docx: &mut Docx, project_path: &str) {
        match node.node_type.as_str() {
            "act" => {
                // Act title as Heading 1
                *docx = std::mem::take(docx).add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(&node.title).bold())
                        .style("Heading1")
                );
            }
            "chapter" => {
                // Chapter title as Heading 2
                *docx = std::mem::take(docx).add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(&node.title).bold())
                        .style("Heading2")
                );
            }
            "scene" => {
                // Scene title as Heading 3
                *docx = std::mem::take(docx).add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(&node.title).bold())
                        .style("Heading3")
                );
                
                // Read scene content
                if let Some(file) = &node.file {
                    let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        // Parse YAML frontmatter + content
                        let parts: Vec<&str> = content.splitn(3, "---").collect();
                        if parts.len() >= 3 {
                            let body = parts[2].trim();
                            
                            // Try to parse as Tiptap JSON
                            if let Ok(tiptap) = serde_json::from_str::<serde_json::Value>(body) {
                                let text = extract_text_from_tiptap(&tiptap);
                                for para in text.split("\n\n").filter(|s| !s.trim().is_empty()) {
                                    *docx = std::mem::take(docx).add_paragraph(
                                        Paragraph::new().add_run(Run::new().add_text(para.trim()))
                                    );
                                }
                            } else {
                                // Plain text fallback
                                for para in body.split("\n\n").filter(|s| !s.trim().is_empty()) {
                                    *docx = std::mem::take(docx).add_paragraph(
                                        Paragraph::new().add_run(Run::new().add_text(para.trim()))
                                    );
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
        
        // Process children
        for child in &node.children {
            add_node_to_docx(child, docx, project_path);
        }
    }
    
    for node in &structure {
        add_node_to_docx(node, &mut docx, &project_path);
    }
    
    // Build and pack the DOCX to a file
    let file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    docx.build().pack(file)
        .map_err(|e| format!("Failed to build DOCX: {}", e))?;
    
    Ok(output_path)
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

/// Export project as JSON string (for cloud backup services like Google Drive)
#[tauri::command]
pub fn export_project_as_json(project_path: String) -> Result<String, String> {
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
    
    serde_json::to_string(&backup).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_project_backup(backup_json: String, series_id: String, series_index: String) -> Result<ProjectMeta, String> {
    // Validate series_id
    if series_id.is_empty() {
        return Err("Series ID is required. All projects must belong to a series.".to_string());
    }
    
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
    let timestamp_str = chrono::Utc::now().format("%Y%m%d%H%M%S");
    let slug = format!("{}_{}", slugify(title), timestamp_str);
    let project_dir = projects_dir.join(&slug);
    
    // Create directory structure (NO codex folder - codex is at series level)
    fs::create_dir_all(project_dir.join(".meta/chat/messages")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("manuscript")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("snippets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("analyses")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("exports")).map_err(|e| e.to_string())?;
    
    let new_id = uuid::Uuid::new_v4().to_string();
    let now = timestamp::now_millis();
    
    let project = ProjectMeta {
        id: new_id.clone(),
        title: title.to_string(),
        author: author.to_string(),
        description: description.to_string(),
        archived: false,
        series_id: series_id.clone(),
        series_index,
        path: project_dir.to_string_lossy().to_string(),
        created_at: now,
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
    
    // Import codex entries to SERIES storage (not project-local)
    if let Some(codex) = backup.get("codex").and_then(|v| v.as_array()) {
        for entry in codex {
            if let (Some(id), Some(category)) = (
                entry.get("id").and_then(|v| v.as_str()),
                entry.get("category").and_then(|v| v.as_str())
            ) {
                let mut entry_clone = entry.clone();
                if let Some(obj) = entry_clone.as_object_mut() {
                    // Update projectId to the new project ID
                    obj.insert("projectId".to_string(), serde_json::Value::String(new_id.clone()));
                }
                // Save to series codex location
                let series_codex_dir = crate::utils::get_series_codex_path(&series_id)?;
                let entry_path = series_codex_dir.join(category).join(format!("{}.json", id));
                let parent_dir = entry_path.parent()
                    .ok_or_else(|| format!("Invalid codex entry path: {:?}", entry_path))?;
                fs::create_dir_all(parent_dir)
                    .map_err(|e| format!("Failed to create codex directory: {}", e))?;
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
    
    // Note: Templates are seeded at series level, not project level
    
    Ok(project)
}
