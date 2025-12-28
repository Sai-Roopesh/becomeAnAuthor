// Series commands

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

use crate::models::{Series, CodexEntry, CodexRelation};
use crate::utils::{get_series_path, get_series_codex_path, get_series_dir, validate_project_title};

// ============== Series CRUD ==============

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
    // Validate title (same rules as project titles)
    validate_project_title(&title)?;
    
    let now = chrono::Utc::now().timestamp_millis();
    
    let new_series = Series {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        created_at: now,
        updated_at: now,
    };
    
    // Create series codex directory structure
    let codex_dir = get_series_codex_path(&new_series.id)?;
    fs::create_dir_all(codex_dir.join("character")).map_err(|e| e.to_string())?;
    fs::create_dir_all(codex_dir.join("location")).map_err(|e| e.to_string())?;
    fs::create_dir_all(codex_dir.join("item")).map_err(|e| e.to_string())?;
    fs::create_dir_all(codex_dir.join("lore")).map_err(|e| e.to_string())?;
    fs::create_dir_all(codex_dir.join("subplot")).map_err(|e| e.to_string())?;
    
    let mut all_series = list_series()?;
    let result = new_series.clone();
    all_series.push(new_series);
    
    let series_path = get_series_path()?;
    let json = serde_json::to_string_pretty(&all_series).map_err(|e| e.to_string())?;
    fs::write(&series_path, json).map_err(|e| e.to_string())?;
    
    Ok(result)
}

#[tauri::command]
pub fn update_series(series_id: String, updates: serde_json::Value) -> Result<(), String> {
    let mut all_series = list_series()?;
    let now = chrono::Utc::now().timestamp_millis();
    
    // Validate title if being updated
    if let Some(title) = updates.get("title").and_then(|v| v.as_str()) {
        validate_project_title(title)?;
    }
    
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
    
    // Also delete the series codex directory
    if let Ok(series_dir) = get_series_dir(&series_id) {
        let _ = fs::remove_dir_all(series_dir);
    }
    
    Ok(())
}

/// Delete a series and cascade delete all projects belonging to it
/// Returns the number of projects deleted
#[tauri::command]
pub fn delete_series_cascade(series_id: String) -> Result<u32, String> {
    use crate::commands::project::{list_projects, delete_project};
    
    // 1. Find all projects belonging to this series
    let all_projects = list_projects()?;
    let projects_to_delete: Vec<_> = all_projects
        .iter()
        .filter(|p| p.series_id == series_id)
        .collect();
    
    let delete_count = projects_to_delete.len() as u32;
    
    // 2. Delete each project (moves to Trash)
    for project in projects_to_delete {
        delete_project(project.path.clone())?;
    }
    
    // 3. Delete the series itself (removes from list + codex directory)
    delete_series(series_id)?;
    
    Ok(delete_count)
}

// ============== Series Codex CRUD ==============

/// List all codex entries for a series
#[tauri::command]
pub fn list_series_codex_entries(series_id: String, category: Option<String>) -> Result<Vec<CodexEntry>, String> {
    let codex_dir = get_series_codex_path(&series_id)?;
    let mut entries = Vec::new();
    
    if !codex_dir.exists() {
        return Ok(entries);
    }
    
    // If category specified, only search that folder
    let search_path = match &category {
        Some(cat) => codex_dir.join(cat),
        None => codex_dir,
    };
    
    if !search_path.exists() {
        return Ok(entries);
    }
    
    for entry in WalkDir::new(&search_path)
        .min_depth(if category.is_some() { 1 } else { 2 })
        .max_depth(if category.is_some() { 1 } else { 2 })
    {
        if let Ok(entry) = entry {
            if entry.file_type().is_file() && entry.path().extension().map_or(false, |e| e == "json") {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    if let Ok(codex_entry) = serde_json::from_str::<CodexEntry>(&content) {
                        entries.push(codex_entry);
                    }
                }
            }
        }
    }
    
    Ok(entries)
}

/// Get a single codex entry by ID
#[tauri::command]
pub fn get_series_codex_entry(series_id: String, entry_id: String) -> Result<Option<CodexEntry>, String> {
    let entries = list_series_codex_entries(series_id, None)?;
    Ok(entries.into_iter().find(|e| e.id == entry_id))
}

/// Save a codex entry to series storage
#[tauri::command]
pub fn save_series_codex_entry(series_id: String, entry: CodexEntry) -> Result<(), String> {
    let codex_dir = get_series_codex_path(&series_id)?;
    let category_dir = codex_dir.join(&entry.category);
    fs::create_dir_all(&category_dir).map_err(|e| e.to_string())?;
    
    let entry_path = category_dir.join(format!("{}.json", entry.id));
    let json = serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?;
    fs::write(&entry_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Delete a codex entry from series storage
#[tauri::command]
pub fn delete_series_codex_entry(series_id: String, entry_id: String, category: String) -> Result<(), String> {
    let codex_dir = get_series_codex_path(&series_id)?;
    let entry_path = codex_dir.join(&category).join(format!("{}.json", entry_id));
    
    if entry_path.exists() {
        fs::remove_file(&entry_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// ============== Series Codex Relations ==============

fn get_relations_path(series_id: &str) -> Result<PathBuf, String> {
    let series_dir = get_series_dir(series_id)?;
    Ok(series_dir.join("codex_relations.json"))
}

/// List all codex relations for a series
#[tauri::command]
pub fn list_series_codex_relations(series_id: String) -> Result<Vec<CodexRelation>, String> {
    let relations_path = get_relations_path(&series_id)?;
    
    if !relations_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&relations_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

/// Save a codex relation to series storage
#[tauri::command]
pub fn save_series_codex_relation(series_id: String, relation: CodexRelation) -> Result<(), String> {
    let relations_path = get_relations_path(&series_id)?;
    let mut relations = list_series_codex_relations(series_id.clone()).unwrap_or_default();
    
    // Update existing or add new
    if let Some(idx) = relations.iter().position(|r| r.id == relation.id) {
        relations[idx] = relation;
    } else {
        relations.push(relation);
    }
    
    let json = serde_json::to_string_pretty(&relations).map_err(|e| e.to_string())?;
    fs::write(&relations_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Delete a codex relation from series storage
#[tauri::command]
pub fn delete_series_codex_relation(series_id: String, relation_id: String) -> Result<(), String> {
    let relations_path = get_relations_path(&series_id)?;
    let mut relations = list_series_codex_relations(series_id).unwrap_or_default();
    
    relations.retain(|r| r.id != relation_id);
    
    let json = serde_json::to_string_pretty(&relations).map_err(|e| e.to_string())?;
    fs::write(&relations_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

// ============== Migration ==============

#[derive(Serialize, Deserialize, Debug)]
pub struct MigrationResult {
    pub total_projects: usize,
    pub migrated_entries: usize,
    pub skipped_entries: usize,
    pub series_affected: Vec<String>,
    pub errors: Vec<String>,
}

/// Migrate codex entries from project-level to series-level storage
/// This is a one-time migration for existing projects
#[tauri::command]
pub fn migrate_codex_to_series() -> Result<MigrationResult, String> {
    // For now, return an empty result since we're in dev mode
    // and don't have existing data to migrate
    Ok(MigrationResult {
        total_projects: 0,
        migrated_entries: 0,
        skipped_entries: 0,
        series_affected: vec![],
        errors: vec![],
    })
}
