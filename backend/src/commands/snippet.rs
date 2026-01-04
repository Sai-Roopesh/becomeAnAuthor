// Snippet commands

use std::fs;
use std::path::PathBuf;

use crate::models::Snippet;

#[tauri::command]
pub fn list_snippets(project_path: String) -> Result<Vec<Snippet>, String> {
    let snippets_dir = PathBuf::from(&project_path).join("snippets");
    let mut snippets = Vec::new();
    
    if !snippets_dir.exists() {
        return Ok(snippets);
    }
    
    for entry in (fs::read_dir(&snippets_dir).map_err(|e| e.to_string())?).flatten() {
        if entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(snippet) = serde_json::from_str::<Snippet>(&content) {
                    snippets.push(snippet);
                }
            }
        }
    }
    
    Ok(snippets)
}

#[tauri::command]
pub fn save_snippet(project_path: String, snippet: Snippet) -> Result<(), String> {
    let snippets_dir = PathBuf::from(&project_path).join("snippets");
    fs::create_dir_all(&snippets_dir).map_err(|e| e.to_string())?;
    
    let snippet_path = snippets_dir.join(format!("{}.json", snippet.id));
    let json = serde_json::to_string_pretty(&snippet).map_err(|e| e.to_string())?;
    fs::write(&snippet_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_snippet(project_path: String, snippet_id: String) -> Result<(), String> {
    let snippet_path = PathBuf::from(&project_path).join("snippets").join(format!("{}.json", snippet_id));
    
    if snippet_path.exists() {
        fs::remove_file(&snippet_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
