// Mention Tracking commands

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// A single mention of a codex entry in the manuscript
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mention {
    pub id: String,
    pub codex_entry_id: String,
    pub source_type: String,  // "scene", "codex", "snippet", "chat"
    pub source_id: String,
    pub source_title: String,
    pub position: usize,
    pub context: String,
    pub created_at: i64,
}

/// Find all mentions of a codex entry name/aliases in a project
#[tauri::command]
pub fn find_mentions(project_path: String, codex_entry_id: String) -> Result<Vec<Mention>, String> {
    let project_path_buf = PathBuf::from(&project_path);
    
    // Load the codex entry to get name and aliases
    let codex_dir = project_path_buf.join("codex");
    let meta_codex_dir = project_path_buf.join(".meta/codex");
    
    // Find the codex entry file
    let mut entry_name = String::new();
    let mut aliases: Vec<String> = Vec::new();
    
    // Search in .meta/codex for the entry
    for category in &["character", "location", "item", "lore", "subplot"] {
        let entry_path = meta_codex_dir.join(category).join(format!("{}.json", codex_entry_id));
        if entry_path.exists() {
            if let Ok(content) = fs::read_to_string(&entry_path) {
                if let Ok(entry) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(name) = entry.get("name").and_then(|v| v.as_str()) {
                        entry_name = name.to_string();
                    }
                    if let Some(alias_arr) = entry.get("aliases").and_then(|v| v.as_array()) {
                        aliases = alias_arr.iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect();
                    }
                }
            }
            break;
        }
    }
    
    // Also check legacy codex directory
    if entry_name.is_empty() {
        for category in &["characters", "locations", "items", "lore", "subplots"] {
            let entry_path = codex_dir.join(category).join(format!("{}.json", codex_entry_id));
            if entry_path.exists() {
                if let Ok(content) = fs::read_to_string(&entry_path) {
                    if let Ok(entry) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(name) = entry.get("name").and_then(|v| v.as_str()) {
                            entry_name = name.to_string();
                        }
                        if let Some(alias_arr) = entry.get("aliases").and_then(|v| v.as_array()) {
                            aliases = alias_arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect();
                        }
                    }
                }
                break;
            }
        }
    }
    
    if entry_name.is_empty() {
        return Ok(Vec::new());
    }
    
    let mut mentions = Vec::new();
    let search_terms: Vec<String> = std::iter::once(entry_name.clone())
        .chain(aliases.into_iter())
        .collect();
    
    // Search in scenes (manuscript directory)
    let manuscript_dir = project_path_buf.join("manuscript");
    if manuscript_dir.exists() {
        if let Ok(entries) = fs::read_dir(&manuscript_dir) {
            for entry in entries.flatten() {
                if entry.path().extension().map_or(false, |e| e == "md") {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        // Extract scene ID and title from frontmatter
                        let parts: Vec<&str> = content.splitn(3, "---").collect();
                        let (scene_id, scene_title) = if parts.len() >= 2 {
                            let yaml = parts[1];
                            let id = yaml.lines()
                                .find(|l| l.starts_with("id:"))
                                .map(|l| l.replace("id:", "").trim().trim_matches('"').to_string())
                                .unwrap_or_default();
                            let title = yaml.lines()
                                .find(|l| l.starts_with("title:"))
                                .map(|l| l.replace("title:", "").trim().trim_matches('"').to_string())
                                .unwrap_or_default();
                            (id, title)
                        } else {
                            continue;
                        };
                        
                        let body = if parts.len() >= 3 { parts[2] } else { "" };
                        
                        // Find mentions in body
                        for term in &search_terms {
                            let term_lower = term.to_lowercase();
                            let body_lower = body.to_lowercase();
                            let mut start = 0;
                            
                            while let Some(pos) = body_lower[start..].find(&term_lower) {
                                let actual_pos = start + pos;
                                
                                // Get surrounding context (50 chars before and after)
                                let context_start = actual_pos.saturating_sub(50);
                                let context_end = (actual_pos + term.len() + 50).min(body.len());
                                let context = body[context_start..context_end].to_string();
                                
                                mentions.push(Mention {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    codex_entry_id: codex_entry_id.clone(),
                                    source_type: "scene".to_string(),
                                    source_id: scene_id.clone(),
                                    source_title: scene_title.clone(),
                                    position: actual_pos,
                                    context: format!("...{}...", context.trim()),
                                    created_at: chrono::Utc::now().timestamp_millis(),
                                });
                                
                                start = actual_pos + term.len();
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Search in snippets
    let snippets_path = project_path_buf.join(".meta/snippets.json");
    if snippets_path.exists() {
        if let Ok(content) = fs::read_to_string(&snippets_path) {
            if let Ok(snippets) = serde_json::from_str::<Vec<serde_json::Value>>(&content) {
                for snippet in snippets {
                    let snippet_id = snippet.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let snippet_title = snippet.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled");
                    
                    // Get text content from Tiptap JSON
                    if let Some(content_obj) = snippet.get("content") {
                        let content_str = serde_json::to_string(content_obj).unwrap_or_default();
                        
                        for term in &search_terms {
                            if content_str.to_lowercase().contains(&term.to_lowercase()) {
                                mentions.push(Mention {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    codex_entry_id: codex_entry_id.clone(),
                                    source_type: "snippet".to_string(),
                                    source_id: snippet_id.to_string(),
                                    source_title: snippet_title.to_string(),
                                    position: 0,
                                    context: format!("Found in snippet: {}", snippet_title),
                                    created_at: chrono::Utc::now().timestamp_millis(),
                                });
                                break; // One mention per snippet
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(mentions)
}

/// Count mentions of a codex entry
#[tauri::command]
pub fn count_mentions(project_path: String, codex_entry_id: String) -> Result<usize, String> {
    let mentions = find_mentions(project_path, codex_entry_id)?;
    Ok(mentions.len())
}
