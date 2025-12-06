// Trash commands (Soft Delete)

use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn move_to_trash(project_path: String, item_id: String, item_type: String, trash_meta: String) -> Result<(), String> {
    let project_dir = PathBuf::from(&project_path);
    let trash_dir = project_dir.join(".meta").join("trash");
    fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;
    
    let meta: serde_json::Value = serde_json::from_str(&trash_meta)
        .map_err(|e| format!("Invalid trash meta: {}", e))?;
    
    let source_path = match item_type.as_str() {
        "scene" => project_dir.join("manuscript").join(format!("{}.md", item_id)),
        "codex" => {
            let codex_dir = project_dir.join("codex");
            let mut found_path = None;
            for category in &["characters", "locations", "items", "lore", "subplots"] {
                let path = codex_dir.join(category).join(format!("{}.json", item_id));
                if path.exists() {
                    found_path = Some(path);
                    break;
                }
            }
            found_path.ok_or("Codex entry not found")?
        },
        "snippet" => project_dir.join("snippets").join(format!("{}.json", item_id)),
        _ => return Err(format!("Unknown item type: {}", item_type)),
    };
    
    if !source_path.exists() {
        return Err("Item not found".to_string());
    }
    
    let trash_item_dir = trash_dir.join(&item_id);
    fs::create_dir_all(&trash_item_dir).map_err(|e| e.to_string())?;
    
    let dest_path = trash_item_dir.join(source_path.file_name().unwrap());
    fs::copy(&source_path, &dest_path).map_err(|e| e.to_string())?;
    
    let meta_path = trash_item_dir.join("meta.json");
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| e.to_string())?;
    
    fs::remove_file(&source_path).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn restore_from_trash(project_path: String, item_id: String, item_type: String) -> Result<(), String> {
    let project_dir = PathBuf::from(&project_path);
    let trash_dir = project_dir.join(".meta").join("trash").join(&item_id);
    
    if !trash_dir.exists() {
        return Err("Trash item not found".to_string());
    }
    
    let entries: Vec<_> = fs::read_dir(&trash_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name() != "meta.json")
        .collect();
    
    let trashed_file = entries.get(0)
        .ok_or("No file found in trash item")?;
    
    let restore_path = match item_type.as_str() {
        "scene" => project_dir.join("manuscript").join(trashed_file.file_name()),
        "codex" => {
            let meta_path = trash_dir.join("meta.json");
            let meta: serde_json::Value = if meta_path.exists() {
                let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                serde_json::Value::Null
            };
            let category = meta.get("category").and_then(|v| v.as_str()).unwrap_or("characters");
            project_dir.join("codex").join(category).join(trashed_file.file_name())
        },
        "snippet" => project_dir.join("snippets").join(trashed_file.file_name()),
        _ => return Err(format!("Unknown item type: {}", item_type)),
    };
    
    fs::copy(trashed_file.path(), &restore_path).map_err(|e| e.to_string())?;
    fs::remove_dir_all(&trash_dir).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn list_trash(project_path: String) -> Result<Vec<serde_json::Value>, String> {
    let trash_dir = PathBuf::from(&project_path).join(".meta").join("trash");
    
    if !trash_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut items = Vec::new();
    
    for entry in fs::read_dir(&trash_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            let meta_path = entry.path().join("meta.json");
            if meta_path.exists() {
                let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
                if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&content) {
                    items.push(meta);
                }
            }
        }
    }
    
    Ok(items)
}

#[tauri::command]
pub fn permanent_delete(project_path: String, item_id: String, _item_type: String) -> Result<(), String> {
    let trash_dir = PathBuf::from(&project_path).join(".meta").join("trash").join(&item_id);
    
    if trash_dir.exists() {
        fs::remove_dir_all(&trash_dir).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn empty_trash(project_path: String) -> Result<(), String> {
    let trash_dir = PathBuf::from(&project_path).join(".meta").join("trash");
    
    if trash_dir.exists() {
        fs::remove_dir_all(&trash_dir).map_err(|e| e.to_string())?;
        fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
