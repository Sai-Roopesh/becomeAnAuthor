// Backup and export commands

use std::fs;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use crate::models::{ProjectMeta, EmergencyBackup, StructureNode, Series, CodexRelation};
use crate::utils::{get_app_dir, get_projects_dir, get_series_codex_path, get_series_dir, slugify, timestamp};

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
    
    for entry in (fs::read_dir(&backups_dir).map_err(|e| e.to_string())?).flatten() {
        if let Ok(content) = fs::read_to_string(entry.path()) {
            if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                if backup.scene_id == scene_id && backup.expires_at > chrono::Utc::now().timestamp_millis() {
                    return Ok(Some(backup));
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
    
    for entry in (fs::read_dir(&backups_dir).map_err(|e| e.to_string())?).flatten() {
        if let Ok(content) = fs::read_to_string(entry.path()) {
            if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                if backup.expires_at < now
                    && fs::remove_file(entry.path()).is_ok() {
                        cleaned += 1;
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

/// Export manuscript as ePub eBook
#[tauri::command]
pub fn export_manuscript_epub(
    project_path: String,
    output_path: String,
    title: Option<String>,
    author: Option<String>,
    language: Option<String>,
) -> Result<String, String> {
    use epub_builder::{EpubBuilder, EpubContent, ZipLibrary};
    
    let structure = crate::commands::project::get_structure(project_path.clone())?;
    let _project_dir = PathBuf::from(&project_path);
    
    // Create ePub builder
    let mut epub = EpubBuilder::new(ZipLibrary::new().map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    
    // Set metadata
    epub.metadata("title", title.as_deref().unwrap_or("Untitled"))
        .map_err(|e| e.to_string())?;
    epub.metadata("author", author.as_deref().unwrap_or("Unknown"))
        .map_err(|e| e.to_string())?;
    epub.metadata("lang", language.as_deref().unwrap_or("en"))
        .map_err(|e| e.to_string())?;
    epub.metadata("generator", "Become An Author")
        .map_err(|e| e.to_string())?;
    
    // Add stylesheet
    let css = r#"
        body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 1em;
            line-height: 1.6;
            text-align: justify;
            margin: 1.5em;
        }
        h1 {
            font-size: 2em;
            margin: 1.5em 0 1em 0;
            text-align: center;
            page-break-before: always;
        }
        h2 {
            font-size: 1.5em;
            margin: 1.2em 0 0.8em 0;
        }
        h3 {
            font-size: 1.2em;
            margin: 1em 0 0.6em 0;
        }
        p {
            margin: 0 0 0.5em 0;
            text-indent: 1.5em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        .scene-break {
            text-align: center;
            margin: 1.5em 0;
        }
    "#;
    epub.stylesheet(css.as_bytes()).map_err(|e| e.to_string())?;
    
    // Process structure and add chapters
    fn add_chapters_to_epub(
        epub: &mut EpubBuilder<ZipLibrary>,
        nodes: &[StructureNode],
        project_path: &str,
        chapter_num: &mut i32,
    ) -> Result<(), String> {
        for node in nodes {
            match node.node_type.as_str() {
                "act" => {
                    // Acts don't become chapters, but process their children
                    add_chapters_to_epub(epub, &node.children, project_path, chapter_num)?;
                }
                "chapter" => {
                    // Each chapter becomes an ePub chapter
                    let mut content = format!("<h2>{}</h2>\n", node.title);
                    
                    // Collect all scene content in this chapter
                    for scene in &node.children {
                        if scene.node_type == "scene" {
                            content.push_str(&format!("<h3>{}</h3>\n", scene.title));
                            
                            if let Some(file) = &scene.file {
                                let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                                if let Ok(file_content) = fs::read_to_string(&file_path) {
                                    let parts: Vec<&str> = file_content.splitn(3, "---").collect();
                                    if parts.len() >= 3 {
                                        let body = parts[2].trim();
                                        
                                        // Try to parse as Tiptap JSON
                                        if let Ok(tiptap) = serde_json::from_str::<serde_json::Value>(body) {
                                            let text = extract_text_from_tiptap(&tiptap);
                                            for para in text.split("\n\n").filter(|s| !s.trim().is_empty()) {
                                                content.push_str(&format!("<p>{}</p>\n", para.trim()));
                                            }
                                        } else {
                                            // Plain text fallback
                                            for para in body.split("\n\n").filter(|s| !s.trim().is_empty()) {
                                                content.push_str(&format!("<p>{}</p>\n", para.trim()));
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Add scene break
                            content.push_str("<p class=\"scene-break\">* * *</p>\n");
                        }
                    }
                    
                    // Add chapter to ePub
                    *chapter_num += 1;
                    epub.add_content(
                        EpubContent::new(format!("chapter{}.xhtml", chapter_num), content.as_bytes())
                            .title(&node.title)
                    ).map_err(|e| e.to_string())?;
                }
                _ => {}
            }
        }
        Ok(())
    }
    
    let mut chapter_num = 0;
    add_chapters_to_epub(&mut epub, &structure, &project_path, &mut chapter_num)?;
    
    // Generate ePub file
    let mut output_file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create output file: {}", e))?;
    
    epub.generate(&mut output_file)
        .map_err(|e| format!("Failed to generate ePub: {}", e))?;
    
    Ok(output_path)
}

fn collect_scene_files(project_path: &str, nodes: &[StructureNode]) -> serde_json::Map<String, serde_json::Value> {
    fn walk(
        project_path: &str,
        nodes: &[StructureNode],
        out: &mut serde_json::Map<String, serde_json::Value>,
    ) {
        for node in nodes {
            if let Some(file) = &node.file {
                let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                if let Ok(content) = fs::read_to_string(file_path) {
                    out.insert(file.clone(), serde_json::Value::String(content));
                }
            }
            if !node.children.is_empty() {
                walk(project_path, &node.children, out);
            }
        }
    }

    let mut files = serde_json::Map::new();
    walk(project_path, nodes, &mut files);
    files
}

fn build_project_backup_payload(project: &ProjectMeta) -> Result<serde_json::Value, String> {
    let structure = crate::commands::project::get_structure(project.path.clone())?;
    let snippets = crate::commands::snippet::list_snippets(project.path.clone())?;
    let scene_files = collect_scene_files(&project.path, &structure);
    let chats = crate::commands::chat::list_chat_threads(project.path.clone()).unwrap_or_default();
    let mut messages = Vec::new();
    for thread in &chats {
        let mut thread_messages = crate::commands::chat::get_chat_messages(
            project.path.clone(),
            thread.id.clone(),
        ).unwrap_or_default();
        messages.append(&mut thread_messages);
    }

    Ok(serde_json::json!({
        "project": project,
        "nodes": structure,
        "sceneFiles": scene_files,
        "snippets": snippets,
        "chats": chats,
        "messages": messages
    }))
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ImportSeriesResult {
    pub series_id: String,
    pub series_title: String,
    pub project_ids: Vec<String>,
    pub imported_project_count: usize,
}

#[tauri::command]
pub fn export_series_backup(series_id: String, output_path: Option<String>) -> Result<String, String> {
    let all_series = crate::commands::series::list_series()?;
    let series = all_series
        .into_iter()
        .find(|s| s.id == series_id)
        .ok_or_else(|| "Series not found".to_string())?;

    let projects = crate::commands::project::list_projects()?
        .into_iter()
        .filter(|p| p.series_id == series.id)
        .collect::<Vec<_>>();

    let mut project_payloads = Vec::with_capacity(projects.len());
    for project in &projects {
        project_payloads.push(build_project_backup_payload(project)?);
    }

    let codex = crate::commands::series::list_series_codex_entries(series.id.clone(), None)?;
    let codex_relations = crate::commands::series::list_series_codex_relations(series.id.clone())?;

    let backup = serde_json::json!({
        "version": 2,
        "backupType": "series",
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "series": series,
        "projects": project_payloads,
        "codex": codex,
        "codexRelations": codex_relations
    });

    let exports_dir = get_series_dir(&series_id)?.join("exports");
    fs::create_dir_all(&exports_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("{}_series_backup_{}.json", slugify(&series.title), timestamp);

    let final_path = output_path
        .map(PathBuf::from)
        .unwrap_or_else(|| exports_dir.join(&filename));

    let json = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;
    fs::write(&final_path, json).map_err(|e| e.to_string())?;

    Ok(final_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn export_series_as_json(series_id: String) -> Result<String, String> {
    let all_series = crate::commands::series::list_series()?;
    let series = all_series
        .into_iter()
        .find(|s| s.id == series_id)
        .ok_or_else(|| "Series not found".to_string())?;

    let projects = crate::commands::project::list_projects()?
        .into_iter()
        .filter(|p| p.series_id == series.id)
        .collect::<Vec<_>>();

    let mut project_payloads = Vec::with_capacity(projects.len());
    for project in &projects {
        project_payloads.push(build_project_backup_payload(project)?);
    }

    let codex = crate::commands::series::list_series_codex_entries(series.id.clone(), None)?;
    let codex_relations = crate::commands::series::list_series_codex_relations(series.id.clone())?;

    let backup = serde_json::json!({
        "version": 2,
        "backupType": "series",
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "series": series,
        "projects": project_payloads,
        "codex": codex,
        "codexRelations": codex_relations
    });

    serde_json::to_string(&backup).map_err(|e| e.to_string())
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
    let scene_files = collect_scene_files(&project_path, &structure);
    let codex = crate::commands::series::list_series_codex_entries(project.series_id.clone(), None)
        .unwrap_or_else(|_| crate::commands::codex::list_codex_entries(project_path.clone()).unwrap_or_default());
    let snippets = crate::commands::snippet::list_snippets(project_path.clone())?;
    
    let backup = serde_json::json!({
        "version": 2,
        "backupType": "project",
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "project": project,
        "nodes": structure,
        "sceneFiles": scene_files,
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
    let scene_files = collect_scene_files(&project_path, &structure);
    let codex = crate::commands::series::list_series_codex_entries(project.series_id.clone(), None)
        .unwrap_or_else(|_| crate::commands::codex::list_codex_entries(project_path.clone()).unwrap_or_default());
    let snippets = crate::commands::snippet::list_snippets(project_path.clone())?;
    
    let backup = serde_json::json!({
        "version": 2,
        "backupType": "project",
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "project": project,
        "nodes": structure,
        "sceneFiles": scene_files,
        "codex": codex,
        "snippets": snippets
    });
    
    serde_json::to_string(&backup).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_project_backup(
    _backup_json: String,
    _series_id: String,
    _series_index: String,
) -> Result<ProjectMeta, String> {
    Err("Project-level import is disabled. Use series backup import instead.".to_string())
}

fn create_project_directory_structure(project_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(project_dir.join(".meta/chat/messages")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("manuscript")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("snippets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("exports")).map_err(|e| e.to_string())?;
    Ok(())
}

fn restore_scene_files(
    project_dir: &Path,
    scene_files: Option<&serde_json::Map<String, serde_json::Value>>,
) -> Result<(), String> {
    if let Some(files) = scene_files {
        for (file_name, content_value) in files {
            if let Some(content) = content_value.as_str() {
                let path = project_dir.join("manuscript").join(file_name);
                fs::write(path, content).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

fn ensure_scene_files_exist(project_dir: &Path, nodes: &[StructureNode]) -> Result<(), String> {
    fn walk(project_dir: &Path, nodes: &[StructureNode]) -> Result<(), String> {
        for node in nodes {
            if let Some(file_name) = &node.file {
                let path = project_dir.join("manuscript").join(file_name);
                if !path.exists() {
                    let now = chrono::Utc::now().to_rfc3339();
                    let fallback = format!(
                        "---\nid: {}\ntitle: \"{}\"\norder: {}\nstatus: draft\nwordCount: 0\npov: null\nsubtitle: null\nlabels: []\nexcludeFromAI: false\nsummary: \"\"\narchived: false\ncreatedAt: {}\nupdatedAt: {}\n---\n\n",
                        node.id,
                        node.title.replace('"', "\\\""),
                        node.order,
                        now,
                        now
                    );
                    fs::write(path, fallback).map_err(|e| e.to_string())?;
                }
            }
            if !node.children.is_empty() {
                walk(project_dir, &node.children)?;
            }
        }
        Ok(())
    }

    walk(project_dir, nodes)
}

fn restore_snippets(
    project_dir: &Path,
    snippets: Option<&Vec<serde_json::Value>>,
    project_id: &str,
) -> Result<(), String> {
    if let Some(snippets) = snippets {
        for snippet in snippets {
            if let Some(id) = snippet.get("id").and_then(|v| v.as_str()) {
                let mut snippet_clone = snippet.clone();
                if let Some(obj) = snippet_clone.as_object_mut() {
                    obj.insert("projectId".to_string(), serde_json::Value::String(project_id.to_string()));
                }
                let snippet_path = project_dir.join("snippets").join(format!("{}.json", id));
                let json = serde_json::to_string_pretty(&snippet_clone).map_err(|e| e.to_string())?;
                fs::write(snippet_path, json).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

fn normalize_timestamp(value: Option<&serde_json::Value>, fallback: i64) -> i64 {
    if let Some(v) = value {
        if let Some(ts) = v.as_i64() {
            return ts;
        }
        if let Some(ts) = v.as_u64() {
            return ts as i64;
        }
    }
    fallback
}

fn restore_chats(
    project_dir: &Path,
    chats: Option<&Vec<serde_json::Value>>,
    messages: Option<&Vec<serde_json::Value>>,
    project_id: &str,
) -> Result<(), String> {
    let chat_root = project_dir.join(".meta/chat");
    let messages_dir = chat_root.join("messages");
    fs::create_dir_all(&messages_dir).map_err(|e| e.to_string())?;

    let now = timestamp::now_millis();
    let mut threads: Vec<serde_json::Value> = Vec::new();
    let mut thread_ids: Vec<String> = Vec::new();
    let mut thread_id_set: HashSet<String> = HashSet::new();
    let mut thread_max_timestamp: HashMap<String, i64> = HashMap::new();
    let mut grouped_messages: HashMap<String, Vec<serde_json::Value>> = HashMap::new();

    if let Some(message_values) = messages {
        for message in message_values {
            let mut normalized = message.clone();
            let Some(obj) = normalized.as_object_mut() else { continue };

            let thread_id = obj
                .get("threadId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if thread_id.is_empty() {
                continue;
            }

            let message_id = obj
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if message_id.is_empty() {
                obj.insert(
                    "id".to_string(),
                    serde_json::Value::String(uuid::Uuid::new_v4().to_string()),
                );
            }

            let role = obj
                .get("role")
                .and_then(|v| v.as_str())
                .unwrap_or("user");
            let normalized_role = if role.eq_ignore_ascii_case("assistant") {
                "assistant"
            } else {
                "user"
            };
            obj.insert(
                "role".to_string(),
                serde_json::Value::String(normalized_role.to_string()),
            );

            let content = obj
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            obj.insert("content".to_string(), serde_json::Value::String(content));

            let ts = normalize_timestamp(obj.get("timestamp"), now);
            obj.insert(
                "timestamp".to_string(),
                serde_json::Value::Number(serde_json::Number::from(ts)),
            );

            grouped_messages
                .entry(thread_id.clone())
                .or_default()
                .push(normalized);
            thread_max_timestamp
                .entry(thread_id)
                .and_modify(|current| {
                    if ts > *current {
                        *current = ts;
                    }
                })
                .or_insert(ts);
        }
    }

    if let Some(chat_values) = chats {
        for chat in chat_values {
            let mut normalized = chat.clone();
            let Some(obj) = normalized.as_object_mut() else { continue };

            let thread_id = obj
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if thread_id.is_empty() || thread_id_set.contains(&thread_id) {
                continue;
            }

            obj.insert(
                "projectId".to_string(),
                serde_json::Value::String(project_id.to_string()),
            );

            let name = obj
                .get("name")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .or_else(|| {
                    obj.get("title")
                        .and_then(|v| v.as_str())
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                })
                .unwrap_or_else(|| "Imported Chat".to_string());
            obj.insert("name".to_string(), serde_json::Value::String(name));

            if obj.get("pinned").is_none() {
                obj.insert("pinned".to_string(), serde_json::Value::Bool(false));
            }
            if obj.get("archived").is_none() {
                obj.insert("archived".to_string(), serde_json::Value::Bool(false));
            }

            let created_at = normalize_timestamp(obj.get("createdAt"), now);
            let mut updated_at = normalize_timestamp(obj.get("updatedAt"), created_at);
            if let Some(max_ts) = thread_max_timestamp.get(&thread_id) {
                if *max_ts > updated_at {
                    updated_at = *max_ts;
                }
            }

            obj.insert(
                "createdAt".to_string(),
                serde_json::Value::Number(serde_json::Number::from(created_at)),
            );
            obj.insert(
                "updatedAt".to_string(),
                serde_json::Value::Number(serde_json::Number::from(updated_at)),
            );

            thread_id_set.insert(thread_id.clone());
            thread_ids.push(thread_id);
            threads.push(normalized);
        }
    }

    for thread_id in grouped_messages.keys() {
        if thread_id_set.contains(thread_id) {
            continue;
        }
        let max_ts = *thread_max_timestamp.get(thread_id).unwrap_or(&now);
        let fallback_thread = serde_json::json!({
            "id": thread_id,
            "projectId": project_id,
            "name": "Imported Chat",
            "pinned": false,
            "archived": false,
            "createdAt": max_ts,
            "updatedAt": max_ts
        });
        thread_id_set.insert(thread_id.clone());
        thread_ids.push(thread_id.clone());
        threads.push(fallback_thread);
    }

    let threads_json = serde_json::to_string_pretty(&threads).map_err(|e| e.to_string())?;
    fs::write(chat_root.join("threads.json"), threads_json).map_err(|e| e.to_string())?;

    for thread_id in thread_ids {
        let mut thread_messages = grouped_messages.remove(&thread_id).unwrap_or_default();
        thread_messages.sort_by_key(|msg| {
            msg.get("timestamp")
                .and_then(|v| v.as_i64())
                .unwrap_or(now)
        });
        let json = serde_json::to_string_pretty(&thread_messages).map_err(|e| e.to_string())?;
        fs::write(messages_dir.join(format!("{}.json", thread_id)), json).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn import_series_backup(backup_json: String) -> Result<ImportSeriesResult, String> {
    let backup: serde_json::Value = serde_json::from_str(&backup_json)
        .map_err(|e| format!("Invalid backup JSON: {}", e))?;

    let backup_type = backup
        .get("backupType")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if backup_type != "series" {
        return Err("Invalid backup: expected a series backup file".to_string());
    }

    let series_data = backup
        .get("series")
        .ok_or("Missing 'series' field in backup")?;

    let title = series_data
        .get("title")
        .and_then(|v| v.as_str())
        .ok_or("Missing series title")?;

    let imported_series: Series = crate::commands::series::create_series(
        title.to_string(),
        series_data.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
        series_data.get("author").and_then(|v| v.as_str()).map(|s| s.to_string()),
        series_data.get("genre").and_then(|v| v.as_str()).map(|s| s.to_string()),
        series_data.get("status").and_then(|v| v.as_str()).map(|s| s.to_string()),
    )?;

    let projects = backup
        .get("projects")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let projects_dir = get_projects_dir()?;
    let mut project_ids = Vec::new();
    let mut project_id_map: HashMap<String, String> = HashMap::new();

    for (index, payload) in projects.iter().enumerate() {
        let source_project_value = payload
            .get("project")
            .ok_or("Missing project payload in series backup")?;
        let source_project: ProjectMeta =
            serde_json::from_value(source_project_value.clone()).map_err(|e| e.to_string())?;

        let timestamp_str = chrono::Utc::now().format("%Y%m%d%H%M%S");
        let slug = format!(
            "{}_{}_{}",
            slugify(&source_project.title),
            timestamp_str,
            index + 1
        );
        let project_dir = projects_dir.join(&slug);
        create_project_directory_structure(&project_dir)?;

        let new_id = uuid::Uuid::new_v4().to_string();
        let now = timestamp::now_millis();
        let imported_project = ProjectMeta {
            id: new_id.clone(),
            title: source_project.title.clone(),
            author: source_project.author.clone(),
            description: source_project.description.clone(),
            archived: source_project.archived,
            language: source_project.language.clone(),
            cover_image: source_project.cover_image.clone(),
            series_id: imported_series.id.clone(),
            series_index: source_project.series_index.clone(),
            path: project_dir.to_string_lossy().to_string(),
            created_at: now,
            updated_at: now,
        };

        let project_json = serde_json::to_string_pretty(&imported_project).map_err(|e| e.to_string())?;
        fs::write(project_dir.join(".meta/project.json"), project_json).map_err(|e| e.to_string())?;

        let nodes_value = payload.get("nodes").cloned().unwrap_or_else(|| serde_json::json!([]));
        let nodes: Vec<StructureNode> = serde_json::from_value(nodes_value).unwrap_or_default();
        let structure_json = serde_json::to_string_pretty(&nodes).map_err(|e| e.to_string())?;
        fs::write(project_dir.join(".meta/structure.json"), structure_json).map_err(|e| e.to_string())?;

        let scene_files = payload.get("sceneFiles").and_then(|v| v.as_object());
        restore_scene_files(&project_dir, scene_files)?;
        ensure_scene_files_exist(&project_dir, &nodes)?;

        let snippets = payload.get("snippets").and_then(|v| v.as_array());
        restore_snippets(&project_dir, snippets, &new_id)?;
        let chats = payload.get("chats").and_then(|v| v.as_array());
        let messages = payload.get("messages").and_then(|v| v.as_array());
        restore_chats(&project_dir, chats, messages, &new_id)?;

        crate::commands::project::add_to_recent(
            imported_project.path.clone(),
            imported_project.title.clone(),
        )?;

        project_id_map.insert(source_project.id.clone(), new_id.clone());
        project_ids.push(new_id);
    }

    if let Some(codex_entries) = backup.get("codex").and_then(|v| v.as_array()) {
        let series_codex_dir = get_series_codex_path(&imported_series.id)?;
        for entry in codex_entries {
            let category = entry
                .get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("lore");
            let entry_id = entry
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Codex entry missing id")?;

            let mut entry_clone = entry.clone();
            if let Some(obj) = entry_clone.as_object_mut() {
                obj.insert(
                    "seriesId".to_string(),
                    serde_json::Value::String(imported_series.id.clone()),
                );

                if let Some(old_project_id) = obj.get("projectId").and_then(|v| v.as_str()) {
                    if let Some(new_project_id) = project_id_map.get(old_project_id) {
                        obj.insert(
                            "projectId".to_string(),
                            serde_json::Value::String(new_project_id.clone()),
                        );
                    }
                }
            }

            let category_dir = series_codex_dir.join(category);
            fs::create_dir_all(&category_dir).map_err(|e| e.to_string())?;
            let entry_path = category_dir.join(format!("{}.json", entry_id));
            let json = serde_json::to_string_pretty(&entry_clone).map_err(|e| e.to_string())?;
            fs::write(entry_path, json).map_err(|e| e.to_string())?;
        }
    }

    let relations_path = get_series_dir(&imported_series.id)?.join("codex_relations.json");
    let mut relations: Vec<CodexRelation> = Vec::new();
    if let Some(raw_relations) = backup.get("codexRelations").and_then(|v| v.as_array()) {
        for relation in raw_relations {
            let mut relation_clone = relation.clone();
            if let Some(obj) = relation_clone.as_object_mut() {
                if let Some(old_project_id) = obj.get("projectId").and_then(|v| v.as_str()) {
                    if let Some(new_project_id) = project_id_map.get(old_project_id) {
                        obj.insert(
                            "projectId".to_string(),
                            serde_json::Value::String(new_project_id.clone()),
                        );
                    } else {
                        obj.remove("projectId");
                    }
                }
            }

            if let Ok(parsed) = serde_json::from_value::<CodexRelation>(relation_clone) {
                relations.push(parsed);
            }
        }
    }
    let relations_json = serde_json::to_string_pretty(&relations).map_err(|e| e.to_string())?;
    fs::write(relations_path, relations_json).map_err(|e| e.to_string())?;

    Ok(ImportSeriesResult {
        series_id: imported_series.id,
        series_title: imported_series.title,
        imported_project_count: project_ids.len(),
        project_ids,
    })
}

/// Write export file data to the specified path
/// Used by frontend to save generated export files to user-selected location
#[tauri::command]
pub fn write_export_file(file_path: String, data: Vec<u8>) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(&path, data).map_err(|e| e.to_string())?;
    
    Ok(())
}
