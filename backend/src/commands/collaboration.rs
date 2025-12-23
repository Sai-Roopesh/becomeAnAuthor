// Collaboration commands for Yjs state persistence

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct YjsState {
    pub scene_id: String,
    pub project_id: String,
    pub update: Vec<u8>,
    pub saved_at: i64,
}

#[tauri::command]
pub fn save_yjs_state(
    project_path: String,
    scene_id: String,
    update: Vec<u8>,
) -> Result<(), String> {
    let yjs_dir = PathBuf::from(&project_path).join(".yjs");
    
    // Ensure .yjs directory exists
    fs::create_dir_all(&yjs_dir).map_err(|e| e.to_string())?;
    
    let state = YjsState {
        scene_id: scene_id.clone(),
        project_id: project_path.clone(),
        update,
        saved_at: chrono::Utc::now().timestamp_millis(),
    };
    
    let file_path = yjs_dir.join(format!("{}.yjs", scene_id));
    let json = serde_json::to_string(&state).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn load_yjs_state(
    project_path: String,
    scene_id: String,
) -> Result<Option<YjsState>, String> {
    let file_path = PathBuf::from(&project_path)
        .join(".yjs")
        .join(format!("{}.yjs", scene_id));
    
    if !file_path.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let state: YjsState = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    Ok(Some(state))
}

#[tauri::command]
pub fn has_yjs_state(
    project_path: String,
    scene_id: String,
) -> Result<bool, String> {
    let file_path = PathBuf::from(&project_path)
        .join(".yjs")
        .join(format!("{}.yjs", scene_id));
    
    Ok(file_path.exists())
}

#[tauri::command]
pub fn delete_yjs_state(
    project_path: String,
    scene_id: String,
) -> Result<(), String> {
    let file_path = PathBuf::from(&project_path)
        .join(".yjs")
        .join(format!("{}.yjs", scene_id));
    
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
