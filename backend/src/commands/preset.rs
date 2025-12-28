// Custom export preset commands
// Allows users to save, list, and delete custom export presets

use std::fs;

use serde::{Deserialize, Serialize};

use crate::utils::get_app_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPreset {
    pub id: String,
    pub name: String,
    pub description: String,
    pub default_format: String,
    pub config: serde_json::Value,
    pub is_builtin: bool,
    pub created_at: i64,
}

/// List all custom export presets
#[tauri::command]
pub fn list_custom_presets() -> Result<Vec<ExportPreset>, String> {
    let path = get_app_dir()?.join("export_presets.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

/// Save a custom export preset
#[tauri::command]
pub fn save_custom_preset(preset: ExportPreset) -> Result<(), String> {
    let path = get_app_dir()?.join("export_presets.json");
    let mut presets = list_custom_presets().unwrap_or_default();

    if let Some(idx) = presets.iter().position(|p| p.id == preset.id) {
        presets[idx] = preset;
    } else {
        presets.push(preset);
    }

    let json = serde_json::to_string_pretty(&presets).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete a custom export preset
#[tauri::command]
pub fn delete_custom_preset(preset_id: String) -> Result<(), String> {
    let path = get_app_dir()?.join("export_presets.json");
    let mut presets = list_custom_presets().unwrap_or_default();
    presets.retain(|p| p.id != preset_id);

    let json = serde_json::to_string_pretty(&presets).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}
