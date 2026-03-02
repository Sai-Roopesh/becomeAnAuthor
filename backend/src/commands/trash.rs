use std::fs;
use std::path::PathBuf;

use crate::utils::{timestamp, validate_no_null_bytes, validate_uuid_format};

fn trash_root(project_path: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(project_path).join(".meta").join("trash");
    fs::create_dir_all(&root).map_err(|e| format!("Failed to ensure trash directory: {e}"))?;
    Ok(root)
}

fn validate_item_type(item_type: &str) -> Result<String, String> {
    let normalized = item_type.trim().to_lowercase();
    if normalized.is_empty() {
        return Err("Trash item type cannot be empty".to_string());
    }
    validate_no_null_bytes(&normalized, "Trash item type")?;
    if normalized
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
    {
        Ok(normalized)
    } else {
        Err("Trash item type contains invalid characters".to_string())
    }
}

fn validate_item_id(item_id: &str) -> Result<String, String> {
    let normalized = item_id.trim().to_string();
    if normalized.is_empty() {
        return Err("Trash item id cannot be empty".to_string());
    }
    validate_no_null_bytes(&normalized, "Trash item id")?;
    if normalized.contains('/') || normalized.contains('\\') {
        return Err("Trash item id cannot contain path separators".to_string());
    }

    match validate_uuid_format(&normalized) {
        Ok(_) => Ok(normalized),
        Err(_) => {
            if normalized
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
            {
                Ok(normalized)
            } else {
                Err("Trash item id must be a UUID or safe identifier".to_string())
            }
        }
    }
}

fn validate_source_path(project_path: &str, source_path: &str) -> Result<PathBuf, String> {
    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("Source path does not exist".to_string());
    }

    let project_root = PathBuf::from(project_path)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {e}"))?;
    let canonical_source = source
        .canonicalize()
        .map_err(|e| format!("Failed to resolve source path: {e}"))?;

    if !canonical_source.starts_with(&project_root) {
        return Err("Source path must be inside project directory".to_string());
    }

    Ok(source)
}

#[tauri::command]
pub fn move_to_trash(
    project_path: String,
    source_path: String,
    item_type: String,
) -> Result<serde_json::Value, String> {
    let source = validate_source_path(&project_path, &source_path)?;
    let item_type = validate_item_type(&item_type)?;
    let item_id = uuid::Uuid::new_v4().to_string();

    let file_name = source
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("item")
        .to_string();

    let trash_dir = trash_root(&project_path)?;
    let dest = trash_dir.join(format!("{}__{}__{}", item_type, item_id, file_name));
    fs::rename(&source, &dest).map_err(|e| format!("Failed to move item to trash: {e}"))?;

    Ok(serde_json::json!({
        "id": item_id,
        "type": item_type,
        "sourcePath": source_path,
        "trashPath": dest.to_string_lossy(),
        "deletedAt": timestamp::now_millis()
    }))
}

#[tauri::command]
pub fn restore_from_trash(
    project_path: String,
    item_id: String,
    item_type: String,
    target_path: String,
) -> Result<(), String> {
    let item_id = validate_item_id(&item_id)?;
    let item_type = validate_item_type(&item_type)?;
    let target = PathBuf::from(target_path);

    let trash_dir = trash_root(&project_path)?;
    let prefix = format!("{}__{}__", item_type, item_id);
    let entry_path = fs::read_dir(&trash_dir)
        .map_err(|e| format!("Failed to read trash dir: {e}"))?
        .flatten()
        .find(|entry| {
            entry
                .file_name()
                .to_str()
                .is_some_and(|name| name.starts_with(&prefix))
        })
        .map(|entry| entry.path())
        .ok_or_else(|| "Trash item not found".to_string())?;

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to ensure restore parent: {e}"))?;
    }
    fs::rename(entry_path, target).map_err(|e| format!("Failed to restore trash item: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn list_trash(project_path: String) -> Result<Vec<serde_json::Value>, String> {
    let trash_dir = trash_root(&project_path)?;
    let mut items = Vec::new();

    for entry in fs::read_dir(&trash_dir)
        .map_err(|e| format!("Failed to read trash dir: {e}"))?
        .flatten()
    {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let parts = name.splitn(3, "__").collect::<Vec<_>>();
        if parts.len() < 3 {
            continue;
        }

        items.push(serde_json::json!({
            "type": parts[0],
            "id": parts[1],
            "name": parts[2],
            "trashPath": path.to_string_lossy(),
        }));
    }

    Ok(items)
}

#[tauri::command]
pub fn permanent_delete(
    project_path: String,
    item_id: String,
    item_type: String,
) -> Result<(), String> {
    let item_id = validate_item_id(&item_id)?;
    let item_type = validate_item_type(&item_type)?;

    let trash_dir = trash_root(&project_path)?;
    let prefix = format!("{}__{}__", item_type, item_id);

    for entry in fs::read_dir(&trash_dir)
        .map_err(|e| format!("Failed to read trash dir: {e}"))?
        .flatten()
    {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&prefix) {
            let path = entry.path();
            if path.is_dir() {
                fs::remove_dir_all(&path)
                    .map_err(|e| format!("Failed to delete trash directory: {e}"))?;
            } else {
                fs::remove_file(&path).map_err(|e| format!("Failed to delete trash file: {e}"))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn empty_trash(project_path: String) -> Result<(), String> {
    let trash_dir = trash_root(&project_path)?;

    for entry in fs::read_dir(&trash_dir)
        .map_err(|e| format!("Failed to read trash dir: {e}"))?
        .flatten()
    {
        let path = entry.path();
        if path.is_dir() {
            fs::remove_dir_all(&path).map_err(|e| format!("Failed to remove trash dir: {e}"))?;
        } else {
            fs::remove_file(&path).map_err(|e| format!("Failed to remove trash file: {e}"))?;
        }
    }

    Ok(())
}
