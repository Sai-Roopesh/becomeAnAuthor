// Scene commands (manuscript text on filesystem, metadata in SQLite)

use std::fs;
use std::path::{Component, Path, PathBuf};

use rusqlite::{params, OptionalExtension};
use serde::Deserialize;

use crate::models::{Scene, SceneMeta};
use crate::storage::open_app_db;
use crate::utils::{
    atomic_write, count_words, timestamp, validate_file_size, validate_no_null_bytes,
    MAX_SCENE_SIZE,
};

fn validate_scene_file_name(scene_file: &str) -> Result<(), String> {
    let trimmed = scene_file.trim();
    if trimmed.is_empty() {
        return Err("Scene file cannot be empty".to_string());
    }

    validate_no_null_bytes(trimmed, "Scene file")?;

    let path = Path::new(trimmed);
    if path.is_absolute() {
        return Err("Scene file must be a relative filename".to_string());
    }

    let mut components = path.components();
    let Some(first) = components.next() else {
        return Err("Scene file cannot be empty".to_string());
    };
    if components.next().is_some() {
        return Err("Scene file cannot contain path separators".to_string());
    }

    if !matches!(first, Component::Normal(_)) {
        return Err("Scene file contains invalid path components".to_string());
    }

    if path.extension().and_then(|e| e.to_str()) != Some("md") {
        return Err("Scene file must end with .md".to_string());
    }

    Ok(())
}

fn project_id_for_path(conn: &rusqlite::Connection, project_path: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT id FROM projects WHERE path = ?1",
        params![project_path],
        |row| row.get::<_, String>(0),
    )
    .map_err(|e| format!("Failed to resolve project id for scene operation: {e}"))
}

fn scene_meta_from_row(row: &rusqlite::Row<'_>) -> Result<SceneMeta, rusqlite::Error> {
    let labels_json: String = row.get(7)?;
    let labels = serde_json::from_str::<Vec<String>>(&labels_json).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(
            labels_json.len(),
            rusqlite::types::Type::Text,
            Box::new(e),
        )
    })?;

    Ok(SceneMeta {
        id: row.get(0)?,
        title: row.get(1)?,
        order: row.get(2)?,
        status: row.get(3)?,
        word_count: row.get(4)?,
        pov_character: row.get(5)?,
        subtitle: row.get(6)?,
        labels,
        exclude_from_ai: row.get::<_, i64>(8)? != 0,
        summary: row.get(9)?,
        archived: row.get::<_, i64>(10)? != 0,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn get_scene_meta_by_file(
    conn: &rusqlite::Connection,
    project_id: &str,
    scene_file: &str,
) -> Result<Option<SceneMeta>, String> {
    conn.query_row(
        r#"
        SELECT scene_id, title, order_index, status, word_count, pov_character, subtitle,
               labels_json, exclude_from_ai, summary, archived, created_at, updated_at
        FROM scene_metadata
        WHERE project_id = ?1 AND scene_file = ?2
        "#,
        params![project_id, scene_file],
        scene_meta_from_row,
    )
    .optional()
    .map_err(|e| format!("Failed to read scene metadata by file: {e}"))
}

fn get_scene_meta_by_id(
    conn: &rusqlite::Connection,
    project_id: &str,
    scene_id: &str,
) -> Result<Option<(SceneMeta, String)>, String> {
    conn.query_row(
        r#"
        SELECT scene_id, title, order_index, status, word_count, pov_character, subtitle,
               labels_json, exclude_from_ai, summary, archived, created_at, updated_at, scene_file
        FROM scene_metadata
        WHERE project_id = ?1 AND scene_id = ?2
        "#,
        params![project_id, scene_id],
        |row| {
            let labels_json: String = row.get(7)?;
            let labels = serde_json::from_str::<Vec<String>>(&labels_json).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    labels_json.len(),
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?;

            Ok((
                SceneMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    order: row.get(2)?,
                    status: row.get(3)?,
                    word_count: row.get(4)?,
                    pov_character: row.get(5)?,
                    subtitle: row.get(6)?,
                    labels,
                    exclude_from_ai: row.get::<_, i64>(8)? != 0,
                    summary: row.get(9)?,
                    archived: row.get::<_, i64>(10)? != 0,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                },
                row.get(13)?,
            ))
        },
    )
    .optional()
    .map_err(|e| format!("Failed to read scene metadata by id: {e}"))
}

fn upsert_scene_meta(
    conn: &rusqlite::Connection,
    project_id: &str,
    scene_file: &str,
    meta: &SceneMeta,
) -> Result<(), String> {
    let labels_json = serde_json::to_string(&meta.labels).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO scene_metadata(
            scene_id, project_id, scene_file, title, order_index, status, word_count,
            pov_character, subtitle, labels_json, exclude_from_ai, summary, archived,
            created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        ON CONFLICT(scene_id) DO UPDATE SET
            project_id = excluded.project_id,
            scene_file = excluded.scene_file,
            title = excluded.title,
            order_index = excluded.order_index,
            status = excluded.status,
            word_count = excluded.word_count,
            pov_character = excluded.pov_character,
            subtitle = excluded.subtitle,
            labels_json = excluded.labels_json,
            exclude_from_ai = excluded.exclude_from_ai,
            summary = excluded.summary,
            archived = excluded.archived,
            updated_at = excluded.updated_at
        "#,
        params![
            meta.id,
            project_id,
            scene_file,
            meta.title,
            meta.order,
            meta.status,
            meta.word_count,
            meta.pov_character,
            meta.subtitle,
            labels_json,
            if meta.exclude_from_ai { 1 } else { 0 },
            meta.summary,
            if meta.archived { 1 } else { 0 },
            meta.created_at,
            meta.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to upsert scene metadata row: {e}"))?;
    Ok(())
}

fn default_scene_meta(scene_file: &str, now: i64) -> SceneMeta {
    let id = scene_file.trim_end_matches(".md").to_string();
    SceneMeta {
        id,
        title: "Untitled Scene".to_string(),
        order: 0,
        status: "draft".to_string(),
        word_count: 0,
        pov_character: None,
        subtitle: None,
        labels: Vec::new(),
        exclude_from_ai: false,
        summary: String::new(),
        archived: false,
        created_at: now,
        updated_at: now,
    }
}

fn scene_file_path(project_path: &str, scene_file: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join("manuscript")
        .join(scene_file)
}

fn read_scene_content(path: &PathBuf) -> Result<String, String> {
    if path.exists() {
        let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
        validate_file_size(metadata.len(), MAX_SCENE_SIZE, "Scene file")?;
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn load_scene(project_path: String, scene_file: String) -> Result<Scene, String> {
    validate_scene_file_name(&scene_file)?;
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let path = scene_file_path(&project_path, &scene_file);
    let content = read_scene_content(&path)?;

    let now = timestamp::now_millis();
    let meta = get_scene_meta_by_file(&conn, &project_id, &scene_file)?
        .unwrap_or_else(|| default_scene_meta(&scene_file, now));

    Ok(Scene { meta, content })
}

#[tauri::command]
pub fn save_scene(
    project_path: String,
    scene_file: String,
    content: String,
    title: Option<String>,
    word_count: i32,
) -> Result<SceneMeta, String> {
    validate_scene_file_name(&scene_file)?;
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let now = timestamp::now_millis();
    let mut meta = get_scene_meta_by_file(&conn, &project_id, &scene_file)?
        .unwrap_or_else(|| default_scene_meta(&scene_file, now));

    if let Some(title) = title {
        let normalized = title.trim().to_string();
        if !normalized.is_empty() {
            meta.title = normalized;
        }
    }

    meta.word_count = if word_count > 0 {
        word_count
    } else {
        count_words(&content)
    };
    meta.updated_at = now;

    let path = scene_file_path(&project_path, &scene_file);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    atomic_write(&path, &content)?;

    upsert_scene_meta(&conn, &project_id, &scene_file, &meta)?;
    Ok(meta)
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SceneMetadataUpdates {
    pub title: Option<String>,
    pub status: Option<String>,
    pub pov: Option<String>,
    pub subtitle: Option<String>,
    pub labels: Option<Vec<String>>,
    pub exclude_from_ai: Option<bool>,
    pub summary: Option<String>,
    pub archived: Option<bool>,
}

#[tauri::command]
pub fn update_scene_metadata(
    project_path: String,
    scene_file: String,
    updates: SceneMetadataUpdates,
) -> Result<SceneMeta, String> {
    validate_scene_file_name(&scene_file)?;
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let path = scene_file_path(&project_path, &scene_file);
    let content = read_scene_content(&path)?;

    let now = timestamp::now_millis();
    let mut meta = get_scene_meta_by_file(&conn, &project_id, &scene_file)?
        .unwrap_or_else(|| default_scene_meta(&scene_file, now));

    if let Some(title) = updates.title {
        let normalized = title.trim().to_string();
        if !normalized.is_empty() {
            meta.title = normalized;
        }
    }
    if let Some(status) = updates.status {
        let normalized = status.trim().to_string();
        if !normalized.is_empty() {
            meta.status = normalized;
        }
    }
    if let Some(pov) = updates.pov {
        let normalized = pov.trim().to_string();
        meta.pov_character = if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        };
    }
    if let Some(subtitle) = updates.subtitle {
        let normalized = subtitle.trim().to_string();
        meta.subtitle = if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        };
    }
    if let Some(labels) = updates.labels {
        meta.labels = labels
            .into_iter()
            .map(|label| label.trim().to_string())
            .filter(|label| !label.is_empty())
            .collect();
    }
    if let Some(exclude) = updates.exclude_from_ai {
        meta.exclude_from_ai = exclude;
    }
    if let Some(summary) = updates.summary {
        meta.summary = summary;
    }
    if let Some(archived) = updates.archived {
        meta.archived = archived;
    }

    meta.word_count = count_words(&content);
    meta.updated_at = now;

    upsert_scene_meta(&conn, &project_id, &scene_file, &meta)?;
    Ok(meta)
}

#[tauri::command]
pub fn delete_scene(project_path: String, scene_file: String) -> Result<(), String> {
    validate_scene_file_name(&scene_file)?;
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let path = scene_file_path(&project_path, &scene_file);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }

    conn.execute(
        "DELETE FROM scene_metadata WHERE project_id = ?1 AND scene_file = ?2",
        params![project_id, scene_file],
    )
    .map_err(|e| format!("Failed to delete scene metadata row: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn save_scene_by_id(
    project_path: String,
    scene_id: String,
    content: String,
    word_count: i32,
) -> Result<SceneMeta, String> {
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let resolved_file =
        if let Some((_, scene_file)) = get_scene_meta_by_id(&conn, &project_id, &scene_id)? {
            scene_file
        } else {
            conn.query_row(
                "SELECT scene_file FROM structure_nodes WHERE id = ?1 AND project_id = ?2",
                params![scene_id, project_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| format!("Failed to resolve scene file from structure nodes: {e}"))?
            .ok_or_else(|| format!("Scene not found: {}", scene_id))?
        };

    save_scene(project_path, resolved_file, content, None, word_count)
}
