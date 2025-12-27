// Scene Note commands

use std::fs;
use std::path::PathBuf;
use crate::models::SceneNote;

#[tauri::command]
pub fn get_scene_note(project_path: String, scene_id: String) -> Result<Option<SceneNote>, String> {
    let note_path = PathBuf::from(&project_path)
        .join(".meta")
        .join("notes")
        .join(format!("{}.json", scene_id));
    
    if !note_path.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&note_path).map_err(|e| e.to_string())?;
    let note = serde_json::from_str::<SceneNote>(&content).map_err(|e| e.to_string())?;
    
    Ok(Some(note))
}

#[tauri::command]
pub fn save_scene_note(project_path: String, note: SceneNote) -> Result<(), String> {
    let notes_dir = PathBuf::from(&project_path).join(".meta").join("notes");
    fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    
    let note_path = notes_dir.join(format!("{}.json", note.scene_id));
    let json = serde_json::to_string_pretty(&note).map_err(|e| e.to_string())?;
    fs::write(&note_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_scene_note(project_path: String, scene_id: String) -> Result<(), String> {
    let note_path = PathBuf::from(&project_path)
        .join(".meta")
        .join("notes")
        .join(format!("{}.json", scene_id));
    
    if note_path.exists() {
        fs::remove_file(&note_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
