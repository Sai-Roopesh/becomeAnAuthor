// Idea commands

use std::fs;
use std::path::PathBuf;
use crate::models::Idea;

#[tauri::command]
pub fn list_ideas(project_path: String) -> Result<Vec<Idea>, String> {
    let ideas_dir = PathBuf::from(&project_path).join("ideas");
    let mut ideas = Vec::new();
    
    if !ideas_dir.exists() {
        return Ok(ideas);
    }
    
    for entry in (fs::read_dir(&ideas_dir).map_err(|e| e.to_string())?).flatten() {
        if entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(idea) = serde_json::from_str::<Idea>(&content) {
                    ideas.push(idea);
                }
            }
        }
    }
    
    Ok(ideas)
}

#[tauri::command]
pub fn create_idea(project_path: String, idea: Idea) -> Result<Idea, String> {
    let ideas_dir = PathBuf::from(&project_path).join("ideas");
    fs::create_dir_all(&ideas_dir).map_err(|e| e.to_string())?;
    
    let idea_path = ideas_dir.join(format!("{}.json", idea.id));
    let json = serde_json::to_string_pretty(&idea).map_err(|e| e.to_string())?;
    fs::write(&idea_path, json).map_err(|e| e.to_string())?;
    
    Ok(idea)
}

#[tauri::command]
pub fn update_idea(project_path: String, idea: Idea) -> Result<Idea, String> {
    let idea_path = PathBuf::from(&project_path).join("ideas").join(format!("{}.json", idea.id));
    let json = serde_json::to_string_pretty(&idea).map_err(|e| e.to_string())?;
    fs::write(&idea_path, json).map_err(|e| e.to_string())?;
    
    Ok(idea)
}

#[tauri::command]
pub fn delete_idea(project_path: String, idea_id: String) -> Result<(), String> {
    let idea_path = PathBuf::from(&project_path).join("ideas").join(format!("{}.json", idea_id));
    
    if idea_path.exists() {
        fs::remove_file(&idea_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
