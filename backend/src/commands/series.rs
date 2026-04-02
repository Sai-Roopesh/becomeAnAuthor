// Series commands (SQLite-backed)

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::models::{CodexEntry, CodexRelation, Series};
use crate::storage::open_app_db;
use crate::utils::validate_project_title;

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

fn now() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn row_to_series(row: &rusqlite::Row<'_>) -> Result<Series, rusqlite::Error> {
    Ok(Series {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        author: row.get(3)?,
        genre: row.get(4)?,
        status: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn get_series(conn: &Connection, series_id: &str) -> Result<Option<Series>, String> {
    conn.query_row(
        r#"
        SELECT id, title, description, author, genre, status, created_at, updated_at
        FROM series
        WHERE id = ?1
        "#,
        params![series_id],
        row_to_series,
    )
    .optional()
    .map_err(|e| format!("Failed to load series: {e}"))
}

fn upsert_series(conn: &Connection, series: &Series) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO series(id, title, description, author, genre, status, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            author = excluded.author,
            genre = excluded.genre,
            status = excluded.status,
            updated_at = excluded.updated_at
        "#,
        params![
            series.id,
            series.title,
            series.description,
            series.author,
            series.genre,
            series.status,
            series.created_at,
            series.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to upsert series: {e}"))?;
    Ok(())
}

fn insert_deleted_series_record(conn: &Connection, series: &Series) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO deleted_series_registry(
            old_series_id, title, description, author, genre, status, deleted_at, restored_series_id
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL)
        ON CONFLICT(old_series_id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            author = excluded.author,
            genre = excluded.genre,
            status = excluded.status,
            deleted_at = excluded.deleted_at,
            restored_series_id = NULL
        "#,
        params![
            series.id,
            series.title,
            series.description,
            series.author,
            series.genre,
            series.status,
            now(),
        ],
    )
    .map_err(|e| format!("Failed to insert deleted series record: {e}"))?;
    Ok(())
}

pub(crate) fn restore_or_recreate_deleted_series(
    old_series_id: &str,
) -> Result<Option<String>, String> {
    let conn = open_app_db()?;
    let record = conn
        .query_row(
            r#"
            SELECT old_series_id, title, description, author, genre, status, deleted_at, restored_series_id
            FROM deleted_series_registry
            WHERE old_series_id = ?1
            "#,
            params![old_series_id],
            |row| {
                Ok(DeletedSeriesRecord {
                    old_series_id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    author: row.get(3)?,
                    genre: row.get(4)?,
                    status: row.get(5)?,
                    deleted_at: row.get(6)?,
                    restored_series_id: row.get(7)?,
                })
            },
        )
        .optional()
        .map_err(|e| format!("Failed to read deleted series record: {e}"))?;

    let Some(record) = record else {
        return Ok(None);
    };

    if let Some(restored_id) = &record.restored_series_id {
        if get_series(&conn, restored_id)?.is_some() {
            return Ok(Some(restored_id.clone()));
        }
    }

    let existing_by_title = conn
        .query_row(
            "SELECT id FROM series WHERE title = ?1 ORDER BY updated_at DESC LIMIT 1",
            params![record.title],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| format!("Failed to lookup series by title: {e}"))?;

    let restored_id = if let Some(existing_id) = existing_by_title {
        existing_id
    } else {
        let mut created = create_series(
            record.title,
            record.description,
            record.author,
            record.genre,
            record.status,
        )?;

        // Force the ID to be the original deleted series ID, not a randomly generated new one,
        // so that dependent projects point back to the right place.
        conn.execute("DELETE FROM series WHERE id = ?1", params![created.id])
            .map_err(|e| format!("Failed to delete randomly generated series: {e}"))?;

        created.id = old_series_id.to_string();
        upsert_series(&conn, &created)?;
        created.id
    };

    conn.execute(
        "UPDATE deleted_series_registry SET restored_series_id = ?1 WHERE old_series_id = ?2",
        params![restored_id, old_series_id],
    )
    .map_err(|e| format!("Failed to update deleted series restore pointer: {e}"))?;

    Ok(Some(restored_id))
}

#[tauri::command]
pub fn list_deleted_series() -> Result<Vec<DeletedSeries>, String> {
    let conn = open_app_db()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT old_series_id, title, deleted_at, restored_series_id
            FROM deleted_series_registry
            ORDER BY deleted_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare deleted series query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })
        .map_err(|e| format!("Failed to execute deleted series query: {e}"))?;

    let mut deleted = Vec::new();
    for row in rows {
        let (old_series_id, title, deleted_at, restored_series_id) =
            row.map_err(|e| format!("Failed to decode deleted series row: {e}"))?;

        if let Some(restored) = restored_series_id {
            if get_series(&conn, &restored)?.is_some() {
                continue;
            }
        }

        deleted.push(DeletedSeries {
            old_series_id,
            title,
            deleted_at,
        });
    }

    Ok(deleted)
}

#[tauri::command]
pub fn permanently_delete_deleted_series(old_series_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let target_title: Option<String> = conn
        .query_row(
            "SELECT title FROM deleted_series_registry WHERE old_series_id = ?1",
            params![old_series_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to load deleted series title: {e}"))?;

    let Some(title) = target_title else {
        return Ok(());
    };

    conn.execute(
        "DELETE FROM deleted_series_registry WHERE title = ?1",
        params![title],
    )
    .map_err(|e| format!("Failed to permanently delete deleted series records: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn restore_deleted_series(old_series_id: String) -> Result<Series, String> {
    let restored_series_id = restore_or_recreate_deleted_series(&old_series_id)?
        .ok_or_else(|| "Deleted series record not found".to_string())?;

    let conn = open_app_db()?;
    get_series(&conn, &restored_series_id)?
        .ok_or_else(|| "Restored series could not be loaded".to_string())
}

#[tauri::command]
pub fn list_series() -> Result<Vec<Series>, String> {
    let conn = open_app_db()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, title, description, author, genre, status, created_at, updated_at
            FROM series
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare series query: {e}"))?;

    let rows = stmt
        .query_map([], row_to_series)
        .map_err(|e| format!("Failed to execute series query: {e}"))?;

    let mut all_series = Vec::new();
    for row in rows {
        all_series.push(row.map_err(|e| format!("Failed to decode series row: {e}"))?);
    }

    Ok(all_series)
}

#[tauri::command]
pub fn create_series(
    title: String,
    description: Option<String>,
    author: Option<String>,
    genre: Option<String>,
    status: Option<String>,
) -> Result<Series, String> {
    validate_project_title(&title)?;

    let now = now();
    let series = Series {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        description,
        author,
        genre,
        status,
        created_at: now,
        updated_at: now,
    };

    let conn = open_app_db()?;
    upsert_series(&conn, &series)?;
    Ok(series)
}

#[tauri::command]
pub fn update_series(series_id: String, updates: serde_json::Value) -> Result<(), String> {
    let conn = open_app_db()?;
    let mut series =
        get_series(&conn, &series_id)?.ok_or_else(|| "Series not found".to_string())?;

    if let Some(title) = updates.get("title").and_then(|v| v.as_str()) {
        validate_project_title(title)?;
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

    series.updated_at = now();
    upsert_series(&conn, &series)
}

#[tauri::command]
pub fn delete_series(series_id: String) -> Result<(), String> {
    let conn = open_app_db()?;

    let linked_projects: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM projects WHERE series_id = ?1",
            params![series_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to count linked projects: {e}"))?;
    if linked_projects > 0 {
        return Err(format!(
            "Cannot delete series with {} linked novel(s). Use delete_series_cascade instead.",
            linked_projects
        ));
    }

    if let Some(series_to_delete) = get_series(&conn, &series_id)? {
        insert_deleted_series_record(&conn, &series_to_delete)?;
    }

    conn.execute("DELETE FROM series WHERE id = ?1", params![series_id])
        .map_err(|e| format!("Failed to delete series row: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_series_cascade(series_id: String) -> Result<u32, String> {
    use crate::commands::project::{delete_project, list_projects};

    let all_projects = list_projects()?;
    let projects_to_delete: Vec<_> = all_projects
        .iter()
        .filter(|project| project.series_id == series_id)
        .collect();

    let delete_count = projects_to_delete.len() as u32;
    for project in projects_to_delete {
        delete_project(project.path.clone())?;
    }

    delete_series(series_id)?;

    Ok(delete_count)
}

fn parse_json_payload<T: for<'de> serde::Deserialize<'de>>(
    payload: &str,
    label: &str,
) -> Result<T, String> {
    serde_json::from_str(payload).map_err(|e| format!("Failed to parse {} payload: {e}", label))
}

#[tauri::command]
pub fn list_series_codex_entries(
    series_id: String,
    category: Option<String>,
) -> Result<Vec<CodexEntry>, String> {
    let conn = open_app_db()?;
    let mut entries = Vec::new();

    if let Some(category_filter) = category {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT payload_json
                FROM codex_entries
                WHERE series_id = ?1 AND category = ?2
                ORDER BY updated_at DESC
                "#,
            )
            .map_err(|e| format!("Failed to prepare codex entry query: {e}"))?;

        let rows = stmt
            .query_map(params![series_id, category_filter], |row| {
                row.get::<_, String>(0)
            })
            .map_err(|e| format!("Failed to execute codex entry query: {e}"))?;

        for row in rows {
            let payload = row.map_err(|e| format!("Failed to decode codex entry row: {e}"))?;
            entries.push(parse_json_payload::<CodexEntry>(&payload, "codex entry")?);
        }
        return Ok(entries);
    }

    let mut stmt = conn
        .prepare(
            r#"
            SELECT payload_json
            FROM codex_entries
            WHERE series_id = ?1
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare codex entry query: {e}"))?;

    let rows = stmt
        .query_map(params![series_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to execute codex entry query: {e}"))?;

    for row in rows {
        let payload = row.map_err(|e| format!("Failed to decode codex entry row: {e}"))?;
        entries.push(parse_json_payload::<CodexEntry>(&payload, "codex entry")?);
    }

    Ok(entries)
}

#[tauri::command]
pub fn get_series_codex_entry(
    series_id: String,
    entry_id: String,
) -> Result<Option<CodexEntry>, String> {
    let conn = open_app_db()?;
    let payload: Option<String> = conn
        .query_row(
            "SELECT payload_json FROM codex_entries WHERE series_id = ?1 AND id = ?2",
            params![series_id, entry_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to load codex entry payload: {e}"))?;

    let Some(payload) = payload else {
        return Ok(None);
    };

    Ok(Some(parse_json_payload::<CodexEntry>(
        &payload,
        "codex entry",
    )?))
}

#[tauri::command]
pub fn save_series_codex_entry(series_id: String, entry: CodexEntry) -> Result<(), String> {
    let conn = open_app_db()?;
    let payload_json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    let aliases_json = serde_json::to_string(&entry.aliases).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_entries(id, series_id, category, name, aliases_json, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            category = excluded.category,
            name = excluded.name,
            aliases_json = excluded.aliases_json,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            entry.id,
            series_id,
            entry.category,
            entry.name,
            aliases_json,
            payload_json,
            entry.created_at,
            entry.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to save series codex entry: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_series_codex_entry(
    series_id: String,
    entry_id: String,
    _category: String,
) -> Result<(), String> {
    let conn = open_app_db()?;

    conn.execute(
        "DELETE FROM codex_entries WHERE series_id = ?1 AND id = ?2",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete codex entry row: {e}"))?;

    conn.execute(
        "DELETE FROM codex_relations WHERE series_id = ?1 AND (parent_id = ?2 OR child_id = ?2)",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete dependent codex relations: {e}"))?;

    conn.execute(
        "DELETE FROM scene_codex_links WHERE series_id = ?1 AND codex_id = ?2",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete dependent scene codex links: {e}"))?;

    conn.execute(
        "DELETE FROM codex_entry_tags WHERE series_id = ?1 AND entry_id = ?2",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete dependent codex entry tag rows: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn list_series_codex_relations(series_id: String) -> Result<Vec<CodexRelation>, String> {
    let conn = open_app_db()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT payload_json
            FROM codex_relations
            WHERE series_id = ?1
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare codex relation query: {e}"))?;

    let rows = stmt
        .query_map(params![series_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to execute codex relation query: {e}"))?;

    let mut relations = Vec::new();
    for row in rows {
        let payload = row.map_err(|e| format!("Failed to decode codex relation row: {e}"))?;
        relations.push(parse_json_payload::<CodexRelation>(
            &payload,
            "codex relation",
        )?);
    }

    Ok(relations)
}

#[tauri::command]
pub fn save_series_codex_relation(
    series_id: String,
    relation: CodexRelation,
) -> Result<(), String> {
    let conn = open_app_db()?;
    let payload_json = serde_json::to_string(&relation).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_relations(id, series_id, parent_id, child_id, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            parent_id = excluded.parent_id,
            child_id = excluded.child_id,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            relation.id,
            series_id,
            relation.parent_id,
            relation.child_id,
            payload_json,
            relation.created_at,
            relation.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to save series codex relation: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_series_codex_relation(series_id: String, relation_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    conn.execute(
        "DELETE FROM codex_relations WHERE series_id = ?1 AND id = ?2",
        params![series_id, relation_id],
    )
    .map_err(|e| format!("Failed to delete series codex relation: {e}"))?;
    Ok(())
}
