// Search commands

use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;
use crate::models::ProjectMeta;
use crate::utils::get_series_codex_path;

#[tauri::command]
pub fn search_project(project_path: String, query: String) -> Result<Vec<serde_json::Value>, String> {
    let mut results = Vec::new();
    let query_lower = query.to_lowercase();
    
    // Search in manuscript (scenes)
    let manuscript_dir = PathBuf::from(&project_path).join("manuscript");
    if manuscript_dir.exists() {
        for entry in WalkDir::new(&manuscript_dir).max_depth(1).into_iter().flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|e| e == "md") {
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
    
    // Search in codex (series-first, fallback to legacy project-local codex)
    let codex_dir = {
        let meta_path = PathBuf::from(&project_path).join(".meta/project.json");
        if let Ok(content) = fs::read_to_string(meta_path) {
            if let Ok(project_meta) = serde_json::from_str::<ProjectMeta>(&content) {
                get_series_codex_path(&project_meta.series_id)
                    .unwrap_or_else(|_| PathBuf::from(&project_path).join(".meta/codex"))
            } else {
                PathBuf::from(&project_path).join(".meta/codex")
            }
        } else {
            PathBuf::from(&project_path).join(".meta/codex")
        }
    };
    if codex_dir.exists() {
        for entry in WalkDir::new(&codex_dir).min_depth(2).max_depth(2).into_iter().flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|e| e == "json") {
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
    
    Ok(results)
}
