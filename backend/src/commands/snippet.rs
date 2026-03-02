// Snippet commands (SQLite-backed)

use rusqlite::{params, OptionalExtension};

use crate::models::Snippet;
use crate::storage::open_app_db;

fn project_id_for_path(conn: &rusqlite::Connection, project_path: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT id FROM projects WHERE path = ?1",
        params![project_path],
        |row| row.get::<_, String>(0),
    )
    .map_err(|e| format!("Failed to resolve project id for snippet operation: {e}"))
}

#[tauri::command]
pub fn list_snippets(project_path: String) -> Result<Vec<Snippet>, String> {
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, project_id, title, content_json, pinned, created_at, updated_at
            FROM snippets
            WHERE project_id = ?1
            ORDER BY pinned DESC, updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare snippet query: {e}"))?;

    let rows = stmt
        .query_map(params![project_id], |row| {
            let content_json: String = row.get(3)?;
            let content = serde_json::from_str(&content_json).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    content_json.len(),
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?;

            Ok(Snippet {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                content,
                pinned: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to execute snippet query: {e}"))?;

    let mut snippets = Vec::new();
    for row in rows {
        snippets.push(row.map_err(|e| format!("Failed to decode snippet row: {e}"))?);
    }
    Ok(snippets)
}

#[tauri::command]
pub fn save_snippet(project_path: String, snippet: Snippet) -> Result<(), String> {
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    let payload = serde_json::to_string(&snippet.content)
        .map_err(|e| format!("Failed to serialize snippet content: {e}"))?;

    let existing_created_at: Option<i64> = conn
        .query_row(
            "SELECT created_at FROM snippets WHERE id = ?1",
            params![snippet.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to read existing snippet timestamp: {e}"))?;

    conn.execute(
        r#"
        INSERT INTO snippets(id, project_id, title, content_json, pinned, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            project_id = excluded.project_id,
            title = excluded.title,
            content_json = excluded.content_json,
            pinned = excluded.pinned,
            updated_at = excluded.updated_at
        "#,
        params![
            snippet.id,
            project_id,
            snippet.title,
            payload,
            if snippet.pinned { 1 } else { 0 },
            existing_created_at.unwrap_or(snippet.created_at),
            snippet.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to upsert snippet row: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_snippet(project_path: String, snippet_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let project_id = project_id_for_path(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM snippets WHERE project_id = ?1 AND id = ?2",
        params![project_id, snippet_id],
    )
    .map_err(|e| format!("Failed to delete snippet: {e}"))?;
    Ok(())
}
