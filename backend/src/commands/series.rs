// Series commands

use std::fs;

use crate::models::Series;
use crate::utils::get_series_path;

#[tauri::command]
pub fn list_series() -> Result<Vec<Series>, String> {
    let series_path = get_series_path()?;
    
    if !series_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&series_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_series(title: String) -> Result<Series, String> {
    let now = chrono::Utc::now().timestamp_millis();
    
    let new_series = Series {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        created_at: now,
        updated_at: now,
    };
    
    let mut all_series = list_series()?;
    all_series.push(new_series.clone());
    
    let series_path = get_series_path()?;
    let json = serde_json::to_string_pretty(&all_series).map_err(|e| e.to_string())?;
    fs::write(&series_path, json).map_err(|e| e.to_string())?;
    
    Ok(new_series)
}

#[tauri::command]
pub fn update_series(series_id: String, updates: serde_json::Value) -> Result<(), String> {
    let mut all_series = list_series()?;
    let now = chrono::Utc::now().timestamp_millis();
    
    if let Some(series) = all_series.iter_mut().find(|s| s.id == series_id) {
        if let Some(title) = updates.get("title").and_then(|v| v.as_str()) {
            series.title = title.to_string();
        }
        series.updated_at = now;
    } else {
        return Err("Series not found".to_string());
    }
    
    let series_path = get_series_path()?;
    let json = serde_json::to_string_pretty(&all_series).map_err(|e| e.to_string())?;
    fs::write(&series_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_series(series_id: String) -> Result<(), String> {
    let mut all_series = list_series()?;
    all_series.retain(|s| s.id != series_id);
    
    let series_path = get_series_path()?;
    let json = serde_json::to_string_pretty(&all_series).map_err(|e| e.to_string())?;
    fs::write(&series_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}
