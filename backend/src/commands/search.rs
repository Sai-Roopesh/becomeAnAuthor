// Search commands

use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

#[tauri::command]
pub fn search_project(project_path: String, query: String) -> Result<Vec<serde_json::Value>, String> {
    let mut results = Vec::new();
    let query_lower = query.to_lowercase();
    
    // Search in manuscript (scenes)
    let manuscript_dir = PathBuf::from(&project_path).join("manuscript");
    if manuscript_dir.exists() {
        for entry in WalkDir::new(&manuscript_dir).max_depth(1) {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "md") {
                    if let Ok(content) = fs::read_to_string(path) {
                        if content.to_lowercase().contains(&query_lower) {
                            results.push(serde_json::json!({
                                "type": "scene",
                                "file": path.file_name().map(|f| f.to_string_lossy().to_string()),
                                "path": path.to_string_lossy().to_string()
                            }));
                        }
                    }
                }
            }
        }
    }
    
    // Search in codex
    let codex_dir = PathBuf::from(&project_path).join("codex");
    if codex_dir.exists() {
        for entry in WalkDir::new(&codex_dir).min_depth(2).max_depth(2) {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "json") {
                    if let Ok(content) = fs::read_to_string(path) {
                        if content.to_lowercase().contains(&query_lower) {
                            results.push(serde_json::json!({
                                "type": "codex",
                                "file": path.file_name().map(|f| f.to_string_lossy().to_string()),
                                "path": path.to_string_lossy().to_string()
                            }));
                        }
                    }
                }
            }
        }
    }
    
    Ok(results)
}
