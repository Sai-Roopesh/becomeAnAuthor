// World Timeline commands

use std::fs;
use std::path::PathBuf;
use crate::models::WorldEvent;

#[tauri::command]
pub fn list_world_events(project_path: String) -> Result<Vec<WorldEvent>, String> {
    let timeline_dir = PathBuf::from(&project_path).join("timeline");
    let mut events = Vec::new();
    
    if !timeline_dir.exists() {
        return Ok(events);
    }
    
    for entry in fs::read_dir(&timeline_dir).map_err(|e| e.to_string())?.flatten() {
        if entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(event) = serde_json::from_str::<WorldEvent>(&content) {
                    events.push(event);
                }
            }
        }
    }
    
    Ok(events)
}

#[tauri::command]
pub fn save_world_event(project_path: String, event: WorldEvent) -> Result<(), String> {
    let timeline_dir = PathBuf::from(&project_path).join("timeline");
    fs::create_dir_all(&timeline_dir).map_err(|e| e.to_string())?;
    
    let event_path = timeline_dir.join(format!("{}.json", event.id));
    let json = serde_json::to_string_pretty(&event).map_err(|e| e.to_string())?;
    fs::write(&event_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_world_event(project_path: String, event_id: String) -> Result<(), String> {
    let event_path = PathBuf::from(&project_path).join("timeline").join(format!("{}.json", event_id));
    
    if event_path.exists() {
        fs::remove_file(&event_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
