// Series commands

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

use crate::models::{Series, CodexEntry, CodexRelation};
use crate::utils::{
    get_app_dir,
    get_series_path,
    get_series_codex_path,
    get_series_dir,
    validate_project_title,
};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeletedSeriesRecord {
    pub old_series_id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub genre: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    pub deleted_at: i64,
    #[serde(default)]
    pub restored_series_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DeletedSeries {
    pub old_series_id: String,
    pub title: String,
    pub deleted_at: i64,
}

fn deleted_series_registry_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let meta_dir = app_dir.join(".meta");
    fs::create_dir_all(&meta_dir).map_err(|e| e.to_string())?;
    Ok(meta_dir.join("deleted_series.json"))
}

fn read_deleted_series_registry() -> Result<Vec<DeletedSeriesRecord>, String> {
    let path = deleted_series_registry_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(serde_json::from_str(&content).unwrap_or_default())
}

fn write_deleted_series_registry(records: &[DeletedSeriesRecord]) -> Result<(), String> {
    let path = deleted_series_registry_path()?;
    let json = serde_json::to_string_pretty(records).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub(crate) fn mark_series_deleted(series: &Series) -> Result<(), String> {
    let mut records = read_deleted_series_registry()?;
    records.retain(|record| record.old_series_id != series.id);
    records.insert(
        0,
        DeletedSeriesRecord {
            old_series_id: series.id.clone(),
            title: series.title.clone(),
            description: series.description.clone(),
            author: series.author.clone(),
            genre: series.genre.clone(),
            status: series.status.clone(),
            deleted_at: chrono::Utc::now().timestamp_millis(),
            restored_series_id: None,
        },
    );
    write_deleted_series_registry(&records)
}

pub(crate) fn restore_or_recreate_deleted_series(
    old_series_id: &str,
) -> Result<Option<String>, String> {
    let mut records = read_deleted_series_registry()?;
    let Some(record_index) = records
        .iter()
        .position(|record| record.old_series_id == old_series_id)
    else {
        return Ok(None);
    };

    let existing_series = list_series()?;
    let record = &records[record_index];

    if let Some(restored_id) = &record.restored_series_id {
        if existing_series.iter().any(|series| &series.id == restored_id) {
            return Ok(Some(restored_id.clone()));
        }
    }

    let recreated_series_id = if let Some(existing) = existing_series
        .iter()
        .find(|series| series.title == record.title)
    {
        existing.id.clone()
    } else {
        let created = create_series(
            record.title.clone(),
            record.description.clone(),
            record.author.clone(),
            record.genre.clone(),
            record.status.clone(),
        )?;
        created.id
    };

    records[record_index].restored_series_id = Some(recreated_series_id.clone());
    write_deleted_series_registry(&records)?;

    Ok(Some(recreated_series_id))
}

#[tauri::command]
pub fn list_deleted_series() -> Result<Vec<DeletedSeries>, String> {
    let existing_series_ids: std::collections::HashSet<String> = list_series()?
        .into_iter()
        .map(|series| series.id)
        .collect();
    let mut records = read_deleted_series_registry()?;
    records.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));

    let mut deleted = Vec::new();
    let mut seen_titles: std::collections::HashSet<String> = std::collections::HashSet::new();
    for record in records {
        if !seen_titles.insert(record.title.clone()) {
            continue;
        }

        if let Some(restored_series_id) = &record.restored_series_id {
            if existing_series_ids.contains(restored_series_id) {
                continue;
            }
        }

        deleted.push(DeletedSeries {
            old_series_id: record.old_series_id,
            title: record.title,
            deleted_at: record.deleted_at,
        });
    }

    deleted.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    Ok(deleted)
}

#[tauri::command]
pub fn permanently_delete_deleted_series(old_series_id: String) -> Result<(), String> {
    let mut records = read_deleted_series_registry()?;
    let target_title = records
        .iter()
        .find(|record| record.old_series_id == old_series_id)
        .map(|record| record.title.clone())
        .ok_or("Deleted series record not found".to_string())?;

    records.retain(|record| record.title != target_title);
    write_deleted_series_registry(&records)
}

#[tauri::command]
pub fn restore_deleted_series(old_series_id: String) -> Result<Series, String> {
    let restored_series_id = restore_or_recreate_deleted_series(&old_series_id)?
        .ok_or("Deleted series record not found".to_string())?;

    let series = list_series()?
        .into_iter()
        .find(|entry| entry.id == restored_series_id)
        .ok_or("Restored series could not be loaded".to_string())?;

    Ok(series)
}

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
pub fn create_series(
    title: String,
    description: Option<String>,
    author: Option<String>,
    genre: Option<String>,
    status: Option<String>,
) -> Result<Series, String> {
    // Validate title (same rules as project titles)
    validate_project_title(&title)?;
    
    let now = chrono::Utc::now().timestamp_millis();
    
    let new_series = Series {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        description,
        author,
        genre,
        status,
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
        if let Some(description) = updates.get("description").and_then(|v| v.as_str()) {
            series.description = Some(description.to_string());
        } else if updates.get("description").is_some_and(|v| v.is_null()) {
            series.description = None;
        }
        if let Some(author) = updates.get("author").and_then(|v| v.as_str()) {
            series.author = Some(author.to_string());
        } else if updates.get("author").is_some_and(|v| v.is_null()) {
            series.author = None;
        }
        if let Some(genre) = updates.get("genre").and_then(|v| v.as_str()) {
            series.genre = Some(genre.to_string());
        } else if updates.get("genre").is_some_and(|v| v.is_null()) {
            series.genre = None;
        }
        if let Some(status) = updates.get("status").and_then(|v| v.as_str()) {
            series.status = Some(status.to_string());
        } else if updates.get("status").is_some_and(|v| v.is_null()) {
            series.status = None;
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
    let linked_projects = crate::commands::project::list_projects()?
        .into_iter()
        .filter(|project| project.series_id == series_id)
        .count();
    if linked_projects > 0 {
        return Err(format!(
            "Cannot delete series with {} linked novel(s). Use delete_series_cascade instead.",
            linked_projects
        ));
    }

    let mut all_series = list_series()?;
    if let Some(series_to_delete) = all_series.iter().find(|s| s.id == series_id) {
        mark_series_deleted(series_to_delete)?;
    }
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
        .max_depth(if category.is_some() { 1 } else { 2 }).into_iter().flatten()
    {
        if entry.file_type().is_file() && entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(codex_entry) = serde_json::from_str::<CodexEntry>(&content) {
                    entries.push(codex_entry);
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

    // Remove stale copies of this entry from other category folders.
    let entry_filename = format!("{}.json", entry.id);
    if codex_dir.exists() {
        for candidate in WalkDir::new(&codex_dir)
            .min_depth(2)
            .max_depth(2)
            .into_iter()
            .flatten()
        {
            if candidate.file_type().is_file()
                && candidate.file_name().to_string_lossy() == entry_filename
            {
                fs::remove_file(candidate.path()).map_err(|e| e.to_string())?;
            }
        }
    }

    let entry_path = category_dir.join(format!("{}.json", entry.id));
    let json = serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?;
    fs::write(&entry_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

/// Delete a codex entry from series storage
#[tauri::command]
pub fn delete_series_codex_entry(series_id: String, entry_id: String, category: String) -> Result<(), String> {
    let codex_dir = get_series_codex_path(&series_id)?;
    let entry_filename = format!("{}.json", entry_id);

    // Delete all copies of this entry across categories.
    if codex_dir.exists() {
        for candidate in WalkDir::new(&codex_dir)
            .min_depth(2)
            .max_depth(2)
            .into_iter()
            .flatten()
        {
            if candidate.file_type().is_file()
                && candidate.file_name().to_string_lossy() == entry_filename
            {
                fs::remove_file(candidate.path()).map_err(|e| e.to_string())?;
            }
        }
    }

    // Backstop the provided category path.
    let entry_path = codex_dir.join(&category).join(&entry_filename);
    if entry_path.exists() {
        fs::remove_file(&entry_path).map_err(|e| e.to_string())?;
    }

    // Cascade remove relations that reference the deleted entry.
    let relations_path = get_relations_path(&series_id)?;
    let mut relations = list_series_codex_relations(series_id).unwrap_or_default();
    relations.retain(|r| r.parent_id != entry_id && r.child_id != entry_id);
    let json = serde_json::to_string_pretty(&relations).map_err(|e| e.to_string())?;
    fs::write(&relations_path, json).map_err(|e| e.to_string())?;

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
