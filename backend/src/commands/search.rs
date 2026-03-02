use rusqlite::params;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use crate::storage::{
    clear_search_index, get_search_signature, open_app_db, set_search_signature,
    upsert_search_document,
};
use crate::utils::timestamp;

fn add_path_metadata_fingerprint(path: &Path, hasher: &mut DefaultHasher) -> Result<(), String> {
    path.to_string_lossy().hash(hasher);
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata for '{}': {}", path.display(), e))?;
    metadata.len().hash(hasher);
    if let Ok(modified) = metadata.modified() {
        let millis = modified
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        millis.hash(hasher);
    }
    Ok(())
}

fn compute_search_signature(
    project_path: &str,
    project_id: &str,
    series_id: &str,
) -> Result<String, String> {
    let conn = open_app_db()?;
    let mut hasher = DefaultHasher::new();
    project_path.hash(&mut hasher);
    project_id.hash(&mut hasher);
    series_id.hash(&mut hasher);

    let scene_agg: (i64, i64) = conn
        .query_row(
            r#"
            SELECT COUNT(1), COALESCE(MAX(updated_at), 0)
            FROM scene_metadata
            WHERE project_id = ?1
            "#,
            params![project_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Failed to compute scene metadata fingerprint: {e}"))?;
    scene_agg.hash(&mut hasher);

    let codex_agg: (i64, i64) = conn
        .query_row(
            r#"
            SELECT COUNT(1), COALESCE(MAX(updated_at), 0)
            FROM codex_entries
            WHERE series_id = ?1
            "#,
            params![series_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Failed to compute codex metadata fingerprint: {e}"))?;
    codex_agg.hash(&mut hasher);

    let mut stmt = conn
        .prepare(
            r#"
            SELECT scene_file
            FROM scene_metadata
            WHERE project_id = ?1
            ORDER BY scene_file ASC
            "#,
        )
        .map_err(|e| format!("Failed to prepare scene file fingerprint query: {e}"))?;
    let rows = stmt
        .query_map(params![project_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query scene files for fingerprinting: {e}"))?;

    for row in rows {
        let scene_file = row.map_err(|e| format!("Failed to decode scene file row: {e}"))?;
        let scene_path = PathBuf::from(project_path)
            .join("manuscript")
            .join(scene_file);
        if scene_path.exists() {
            add_path_metadata_fingerprint(&scene_path, &mut hasher)?;
        }
    }

    Ok(format!("{:x}", hasher.finish()))
}

fn rebuild_search_index_for_project(
    project_path: &str,
    project_id: &str,
    series_id: &str,
    signature: &str,
) -> Result<(), String> {
    let conn = open_app_db()?;
    clear_search_index(&conn, project_path)?;

    let mut scene_stmt = conn
        .prepare(
            r#"
            SELECT scene_id, title, scene_file
            FROM scene_metadata
            WHERE project_id = ?1
            ORDER BY order_index ASC
            "#,
        )
        .map_err(|e| format!("Failed to prepare scene indexing query: {e}"))?;
    let scene_rows = scene_stmt
        .query_map(params![project_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| format!("Failed to query scenes for indexing: {e}"))?;

    for row in scene_rows {
        let (scene_id, scene_title, scene_file) =
            row.map_err(|e| format!("Failed to decode scene indexing row: {e}"))?;
        let scene_path = PathBuf::from(project_path)
            .join("manuscript")
            .join(&scene_file);
        let body = fs::read_to_string(&scene_path).unwrap_or_default();
        upsert_search_document(
            &conn,
            project_path,
            "scene",
            &scene_id,
            &scene_title,
            &body,
            None,
            &scene_path.to_string_lossy(),
        )?;
    }

    let mut codex_stmt = conn
        .prepare(
            r#"
            SELECT id, name, category, payload_json
            FROM codex_entries
            WHERE series_id = ?1
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare codex indexing query: {e}"))?;
    let codex_rows = codex_stmt
        .query_map(params![series_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| format!("Failed to query codex entries for indexing: {e}"))?;

    for row in codex_rows {
        let (entry_id, entry_title, category, payload_json) =
            row.map_err(|e| format!("Failed to decode codex indexing row: {e}"))?;
        let parsed: serde_json::Value = serde_json::from_str(&payload_json)
            .map_err(|e| format!("Failed to parse codex payload for indexing: {e}"))?;
        let description = parsed
            .get("description")
            .and_then(|value| value.as_str())
            .unwrap_or("");
        let body = if description.trim().is_empty() {
            payload_json.as_str()
        } else {
            description
        };
        upsert_search_document(
            &conn,
            project_path,
            "codex",
            &entry_id,
            &entry_title,
            body,
            Some(&category),
            &format!("sqlite://codex_entries/{}", entry_id),
        )?;
    }

    set_search_signature(&conn, project_path, signature, timestamp::now_millis())?;
    Ok(())
}

fn ensure_search_index(project_path: &str) -> Result<(), String> {
    let conn = open_app_db()?;
    let (project_id, series_id): (String, String) = conn
        .query_row(
            "SELECT id, series_id FROM projects WHERE path = ?1",
            params![project_path],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Failed to resolve project for search indexing: {e}"))?;

    let signature = compute_search_signature(project_path, &project_id, &series_id)?;
    let existing_signature = get_search_signature(&conn, project_path)?;
    if existing_signature.as_deref() != Some(signature.as_str()) {
        rebuild_search_index_for_project(project_path, &project_id, &series_id, &signature)?;
    }

    Ok(())
}

fn sanitize_fts_query(value: &str) -> String {
    value
        .split_whitespace()
        .map(|token| format!("\"{}\"", token.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" AND ")
}

#[tauri::command]
pub fn search_project(
    project_path: String,
    query: String,
    scope: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    let query_trimmed = query.trim();
    if query_trimmed.is_empty() {
        return Ok(Vec::new());
    }

    ensure_search_index(&project_path)?;

    let fts_query = sanitize_fts_query(query_trimmed);
    if fts_query.is_empty() {
        return Ok(Vec::new());
    }

    let scope = scope.unwrap_or_else(|| "all".to_string());
    let conn = open_app_db()?;
    let mut results = Vec::new();

    let sql = if scope == "scenes" {
        r#"
        SELECT doc_id, title, doc_type, category, path,
               snippet(search_index, 4, '', '', ' ... ', 24) AS snippet,
               (-bm25(search_index, 6.0, 1.0)) AS score
        FROM search_index
        WHERE project_path = ?1
          AND doc_type = 'scene'
          AND search_index MATCH ?2
        ORDER BY score DESC, title ASC
        LIMIT 250
        "#
    } else if scope == "codex" {
        r#"
        SELECT doc_id, title, doc_type, category, path,
               snippet(search_index, 4, '', '', ' ... ', 24) AS snippet,
               (-bm25(search_index, 6.0, 1.0)) AS score
        FROM search_index
        WHERE project_path = ?1
          AND doc_type = 'codex'
          AND search_index MATCH ?2
        ORDER BY score DESC, title ASC
        LIMIT 250
        "#
    } else {
        r#"
        SELECT doc_id, title, doc_type, category, path,
               snippet(search_index, 4, '', '', ' ... ', 24) AS snippet,
               (-bm25(search_index, 6.0, 1.0)) AS score
        FROM search_index
        WHERE project_path = ?1
          AND search_index MATCH ?2
        ORDER BY score DESC, title ASC
        LIMIT 250
        "#
    };

    let mut statement = conn
        .prepare(sql)
        .map_err(|e| format!("Failed preparing indexed search query: {}", e))?;
    let mut rows = statement
        .query(params![project_path, fts_query])
        .map_err(|e| format!("Failed running indexed search query: {}", e))?;

    while let Some(row) = rows
        .next()
        .map_err(|e| format!("Failed iterating indexed search rows: {}", e))?
    {
        let id: String = row
            .get(0)
            .map_err(|e| format!("Invalid search row id: {}", e))?;
        let title: String = row
            .get(1)
            .map_err(|e| format!("Invalid search row title: {}", e))?;
        let doc_type: String = row
            .get(2)
            .map_err(|e| format!("Invalid search row doc_type: {}", e))?;
        let category: Option<String> = row
            .get(3)
            .map_err(|e| format!("Invalid search row category: {}", e))?;
        let path: String = row
            .get(4)
            .map_err(|e| format!("Invalid search row path: {}", e))?;
        let snippet: Option<String> = row
            .get(5)
            .map_err(|e| format!("Invalid search row snippet: {}", e))?;
        let score: f64 = row
            .get(6)
            .map_err(|e| format!("Invalid search row score: {}", e))?;

        let content_type = if doc_type == "scene" {
            "scene"
        } else {
            "codex"
        };
        let mut value = serde_json::json!({
            "id": id,
            "title": title,
            "type": doc_type,
            "contentType": content_type,
            "snippet": snippet.unwrap_or_default(),
            "score": score,
            "path": path
        });
        if let Some(category) = category {
            value["category"] = serde_json::Value::String(category);
        }
        results.push(value);
    }

    Ok(results)
}
