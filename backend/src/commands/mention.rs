use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::storage::open_app_db;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mention {
    pub id: String,
    pub codex_entry_id: String,
    pub source_type: String, // "scene", "codex", "snippet", "chat"
    pub source_id: String,
    pub source_title: String,
    pub position: usize,
    pub context: String,
    pub created_at: i64,
}

fn normalize_terms(entry_name: String, aliases: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut terms = Vec::new();
    for candidate in std::iter::once(entry_name).chain(aliases) {
        let trimmed = candidate.trim();
        if trimmed.is_empty() {
            continue;
        }
        let lowered = trimmed.to_lowercase();
        if seen.insert(lowered.clone()) {
            terms.push(lowered);
        }
    }
    terms
}

fn find_first_mention(content: &str, terms: &[String]) -> Option<(usize, String)> {
    let lowered = content.to_lowercase();
    let mut best: Option<(usize, usize)> = None;

    for term in terms {
        if let Some(pos) = lowered.find(term) {
            let term_len = term.len();
            match best {
                Some((best_pos, _)) if pos >= best_pos => {}
                _ => best = Some((pos, term_len)),
            }
        }
    }

    let (position, term_len) = best?;
    let start = position.saturating_sub(50);
    let end = (position + term_len + 50).min(lowered.len());
    let context = lowered[start..end].trim().to_string();
    Some((position, format!("...{}...", context)))
}

fn find_all_mentions_in_text(
    codex_entry_id: &str,
    source_type: &str,
    source_id: &str,
    source_title: &str,
    text: &str,
    terms: &[String],
    mentions: &mut Vec<Mention>,
) {
    let lowered = text.to_lowercase();
    for term in terms {
        let mut cursor = 0usize;
        while let Some(pos) = lowered[cursor..].find(term) {
            let actual = cursor + pos;
            let start = actual.saturating_sub(50);
            let end = (actual + term.len() + 50).min(lowered.len());
            let context = lowered[start..end].trim().to_string();
            mentions.push(Mention {
                id: uuid::Uuid::new_v4().to_string(),
                codex_entry_id: codex_entry_id.to_string(),
                source_type: source_type.to_string(),
                source_id: source_id.to_string(),
                source_title: source_title.to_string(),
                position: actual,
                context: format!("...{}...", context),
                created_at: chrono::Utc::now().timestamp_millis(),
            });
            cursor = actual.saturating_add(term.len());
            if cursor >= lowered.len() {
                break;
            }
        }
    }
}

#[tauri::command]
pub fn find_mentions(project_path: String, codex_entry_id: String) -> Result<Vec<Mention>, String> {
    let conn = open_app_db()?;

    let (project_id, series_id): (String, String) = conn
        .query_row(
            "SELECT id, series_id FROM projects WHERE path = ?1",
            params![project_path],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Failed to resolve project for mention scan: {e}"))?;

    let codex_payload: Option<String> = conn
        .query_row(
            "SELECT payload_json FROM codex_entries WHERE series_id = ?1 AND id = ?2",
            params![series_id, codex_entry_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to load codex entry for mention scan: {e}"))?;

    let Some(codex_payload) = codex_payload else {
        return Ok(Vec::new());
    };

    let codex_value: serde_json::Value = serde_json::from_str(&codex_payload)
        .map_err(|e| format!("Failed to parse codex entry payload for mention scan: {e}"))?;
    let entry_name = codex_value
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let aliases = codex_value
        .get("aliases")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(ToString::to_string))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let terms = normalize_terms(entry_name, aliases);
    if terms.is_empty() {
        return Ok(Vec::new());
    }

    let mut mentions = Vec::new();

    let mut scene_stmt = conn
        .prepare(
            r#"
            SELECT scene_id, title, scene_file
            FROM scene_metadata
            WHERE project_id = ?1
            ORDER BY order_index ASC
            "#,
        )
        .map_err(|e| format!("Failed to prepare scene metadata query for mention scan: {e}"))?;
    let scene_rows = scene_stmt
        .query_map(params![project_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| format!("Failed to query scene metadata for mention scan: {e}"))?;

    for row in scene_rows {
        let (scene_id, title, scene_file) =
            row.map_err(|e| format!("Failed to decode scene metadata row: {e}"))?;
        let scene_path = PathBuf::from(&project_path)
            .join("manuscript")
            .join(scene_file);
        let content = fs::read_to_string(&scene_path).unwrap_or_default();
        if content.is_empty() {
            continue;
        }
        find_all_mentions_in_text(
            &codex_entry_id,
            "scene",
            &scene_id,
            &title,
            &content,
            &terms,
            &mut mentions,
        );
    }

    let mut snippet_stmt = conn
        .prepare(
            r#"
            SELECT id, title, content_json
            FROM snippets
            WHERE project_id = ?1
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare snippet mention query: {e}"))?;
    let snippet_rows = snippet_stmt
        .query_map(params![project_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| format!("Failed to query snippets for mention scan: {e}"))?;

    for row in snippet_rows {
        let (snippet_id, snippet_title, content_json) =
            row.map_err(|e| format!("Failed to decode snippet row: {e}"))?;
        if let Some((position, context)) = find_first_mention(&content_json, &terms) {
            mentions.push(Mention {
                id: uuid::Uuid::new_v4().to_string(),
                codex_entry_id: codex_entry_id.clone(),
                source_type: "snippet".to_string(),
                source_id: snippet_id,
                source_title: snippet_title,
                position,
                context,
                created_at: chrono::Utc::now().timestamp_millis(),
            });
        }
    }

    let mut codex_stmt = conn
        .prepare(
            r#"
            SELECT id, name, payload_json
            FROM codex_entries
            WHERE series_id = ?1 AND id != ?2
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare codex mention query: {e}"))?;
    let codex_rows = codex_stmt
        .query_map(params![series_id, codex_entry_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| format!("Failed to query codex entries for mention scan: {e}"))?;

    for row in codex_rows {
        let (entry_id, entry_name, payload_json) =
            row.map_err(|e| format!("Failed to decode codex entry row: {e}"))?;
        if let Some((position, context)) = find_first_mention(&payload_json, &terms) {
            mentions.push(Mention {
                id: uuid::Uuid::new_v4().to_string(),
                codex_entry_id: codex_entry_id.clone(),
                source_type: "codex".to_string(),
                source_id: entry_id,
                source_title: entry_name,
                position,
                context,
                created_at: chrono::Utc::now().timestamp_millis(),
            });
        }
    }

    let mut chat_stmt = conn
        .prepare(
            r#"
            SELECT m.id, COALESCE(t.name, 'Chat'), m.content
            FROM chat_messages m
            LEFT JOIN chat_threads t
              ON t.project_path = m.project_path
             AND t.id = m.thread_id
            WHERE m.project_path = ?1
            ORDER BY m.timestamp ASC
            "#,
        )
        .map_err(|e| format!("Failed to prepare chat mention query: {e}"))?;
    let chat_rows = chat_stmt
        .query_map(params![project_path], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| format!("Failed to query chat messages for mention scan: {e}"))?;

    for row in chat_rows {
        let (message_id, thread_name, content) =
            row.map_err(|e| format!("Failed to decode chat message row: {e}"))?;
        if let Some((position, context)) = find_first_mention(&content, &terms) {
            mentions.push(Mention {
                id: uuid::Uuid::new_v4().to_string(),
                codex_entry_id: codex_entry_id.clone(),
                source_type: "chat".to_string(),
                source_id: message_id,
                source_title: thread_name,
                position,
                context,
                created_at: chrono::Utc::now().timestamp_millis(),
            });
        }
    }

    Ok(mentions)
}

#[tauri::command]
pub fn count_mentions(project_path: String, codex_entry_id: String) -> Result<usize, String> {
    Ok(find_mentions(project_path, codex_entry_id)?.len())
}
