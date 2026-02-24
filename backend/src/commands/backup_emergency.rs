use std::fs;

use crate::models::EmergencyBackup;
use crate::utils::{atomic_write, get_app_dir};

#[tauri::command]
pub fn save_emergency_backup(backup: EmergencyBackup) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let backup_path = backups_dir.join(format!("{}.json", backup.id));
    let json = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;
    atomic_write(&backup_path, &json)?;

    Ok(())
}

#[tauri::command]
pub fn get_emergency_backup(scene_id: String) -> Result<Option<EmergencyBackup>, String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");

    if !backups_dir.exists() {
        return Ok(None);
    }

    for entry in (fs::read_dir(&backups_dir).map_err(|e| e.to_string())?).flatten() {
        if let Ok(content) = fs::read_to_string(entry.path()) {
            if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                if backup.scene_id == scene_id
                    && backup.expires_at > chrono::Utc::now().timestamp_millis()
                {
                    return Ok(Some(backup));
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub fn delete_emergency_backup(backup_id: String) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    let backup_path = app_dir
        .join(".emergency_backups")
        .join(format!("{}.json", backup_id));

    if backup_path.exists() {
        fs::remove_file(&backup_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn cleanup_emergency_backups() -> Result<i32, String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join(".emergency_backups");

    if !backups_dir.exists() {
        return Ok(0);
    }

    let now = chrono::Utc::now().timestamp_millis();
    let mut cleaned = 0;

    for entry in (fs::read_dir(&backups_dir).map_err(|e| e.to_string())?).flatten() {
        if let Ok(content) = fs::read_to_string(entry.path()) {
            if let Ok(backup) = serde_json::from_str::<EmergencyBackup>(&content) {
                if backup.expires_at < now && fs::remove_file(entry.path()).is_ok() {
                    cleaned += 1;
                }
            }
        }
    }

    Ok(cleaned)
}
