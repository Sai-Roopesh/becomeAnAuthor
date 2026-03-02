// Scene Note commands (SQLite-backed)

use rusqlite::{params, OptionalExtension};

use crate::models::SceneNote;
use crate::storage::open_app_db;

fn project_id_for_path(conn: &rusqlite::Connection, project_path: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT id FROM projects WHERE path = ?1",
        params![project_path],
        |row| row.get::<_, String>(0),
    )
    .map_err(|e| format!("Failed to resolve project id for scene note operation: {e}"))
}

#[tauri::command]
pub fn get_scene_note(project_path: String, scene_id: String) -> Result<Option<SceneNote>, String> {
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    conn.query_row(
        r#"
        SELECT id, scene_id, project_id, content_json, created_at, updated_at
        FROM scene_notes
        WHERE project_id = ?1 AND scene_id = ?2
        "#,
        params![project_id, scene_id],
        |row| {
            let content_json: String = row.get(3)?;
            let content = serde_json::from_str(&content_json).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    content_json.len(),
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?;

            Ok(SceneNote {
                id: row.get(0)?,
                scene_id: row.get(1)?,
                project_id: row.get(2)?,
                content,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("Failed to fetch scene note: {e}"))
}

#[tauri::command]
pub fn save_scene_note(project_path: String, note: SceneNote) -> Result<(), String> {
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let content_json = serde_json::to_string(&note.content)
        .map_err(|e| format!("Failed to serialize scene note content: {e}"))?;

    let existing_created_at: Option<i64> = conn
        .query_row(
            "SELECT created_at FROM scene_notes WHERE project_id = ?1 AND scene_id = ?2",
            params![project_id, note.scene_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to read scene note created_at: {e}"))?;

    conn.execute(
        r#"
        INSERT INTO scene_notes(id, project_id, scene_id, content_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(project_id, scene_id) DO UPDATE SET
            id = excluded.id,
            content_json = excluded.content_json,
            updated_at = excluded.updated_at
        "#,
        params![
            note.id,
            project_id,
            note.scene_id,
            content_json,
            existing_created_at.unwrap_or(note.created_at),
            note.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to upsert scene note: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_scene_note(project_path: String, scene_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM scene_notes WHERE project_id = ?1 AND scene_id = ?2",
        params![project_id, scene_id],
    )
    .map_err(|e| format!("Failed to delete scene note: {e}"))?;

    Ok(())
}
