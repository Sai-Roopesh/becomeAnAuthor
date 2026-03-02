// Backup and export commands (SQLite-backed metadata; filesystem scene text/artifacts only)

use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};

use crate::commands::backup_manuscript::collect_scene_files;
use crate::models::{
    ChatMessage, ChatThread, CodexEntry, CodexRelation, ProjectMeta, SceneNote, Series, Snippet,
    StructureNode,
};
use crate::storage::open_app_db;
use crate::utils::{atomic_write, get_series_dir, slugify, validate_no_null_bytes};

fn project_from_row(row: &rusqlite::Row<'_>) -> Result<ProjectMeta, rusqlite::Error> {
    Ok(ProjectMeta {
        id: row.get(0)?,
        title: row.get(1)?,
        author: row.get(2)?,
        description: row.get(3)?,
        path: row.get(4)?,
        archived: row.get::<_, i64>(5)? != 0,
        language: row.get(6)?,
        cover_image: row.get(7)?,
        series_id: row.get(8)?,
        series_index: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn load_project(project_path: &str) -> Result<ProjectMeta, String> {
    let conn = open_app_db()?;
    conn.query_row(
        r#"
        SELECT id, title, author, description, path, archived, language, cover_image,
               series_id, series_index, created_at, updated_at
        FROM projects
        WHERE path = ?1
        "#,
        params![project_path],
        project_from_row,
    )
    .optional()
    .map_err(|e| format!("Failed to load project metadata: {e}"))?
    .ok_or_else(|| "Project not found".to_string())
}

fn build_project_backup_payload(project: &ProjectMeta) -> Result<serde_json::Value, String> {
    let conn = open_app_db()?;
    let structure = crate::commands::project::get_structure(project.path.clone())?;
    let snippets = crate::commands::snippet::list_snippets(project.path.clone())?;
    let scene_notes = list_scene_notes_for_project(&conn, &project.id)?;
    let scene_files = collect_scene_files(&project.path, &structure);
    let chats = crate::commands::chat::list_chat_threads(project.path.clone())?;
    let mut messages = Vec::new();
    for thread in &chats {
        let mut thread_messages =
            crate::commands::chat::get_chat_messages(project.path.clone(), thread.id.clone())
                .map_err(|e| format!("Failed to collect chat messages for backup: {e}"))?;
        messages.append(&mut thread_messages);
    }

    Ok(serde_json::json!({
        "project": project,
        "nodes": structure,
        "sceneFiles": scene_files,
        "snippets": snippets,
        "sceneNotes": scene_notes,
        "chats": chats,
        "messages": messages
    }))
}

fn build_project_export_payload(project: &ProjectMeta) -> Result<serde_json::Value, String> {
    let conn = open_app_db()?;
    let structure = crate::commands::project::get_structure(project.path.clone())?;
    let scene_files = collect_scene_files(&project.path, &structure);
    let codex =
        crate::commands::series::list_series_codex_entries(project.series_id.clone(), None)?;
    let snippets = crate::commands::snippet::list_snippets(project.path.clone())?;
    let scene_notes = list_scene_notes_for_project(&conn, &project.id)?;

    Ok(serde_json::json!({
        "version": 2,
        "backupType": "project",
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "project": project,
        "nodes": structure,
        "sceneFiles": scene_files,
        "codex": codex,
        "snippets": snippets,
        "sceneNotes": scene_notes
    }))
}

fn build_series_export_payload(series_id: &str) -> Result<(Series, serde_json::Value), String> {
    let all_series = crate::commands::series::list_series()?;
    let series = all_series
        .into_iter()
        .find(|s| s.id == series_id)
        .ok_or_else(|| "Series not found".to_string())?;

    let projects = crate::commands::project::list_projects()?
        .into_iter()
        .filter(|p| p.series_id == series.id)
        .collect::<Vec<_>>();

    let mut project_payloads = Vec::with_capacity(projects.len());
    for project in &projects {
        project_payloads.push(build_project_backup_payload(project)?);
    }

    let codex = crate::commands::series::list_series_codex_entries(series.id.clone(), None)?;
    let codex_relations = crate::commands::series::list_series_codex_relations(series.id.clone())?;

    let payload = serde_json::json!({
        "version": 2,
        "backupType": "series",
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "series": series,
        "projects": project_payloads,
        "codex": codex,
        "codexRelations": codex_relations
    });

    Ok((series, payload))
}

fn write_backup_payload(
    payload: &serde_json::Value,
    output_path: Option<String>,
    default_dir: PathBuf,
    default_filename: String,
) -> Result<String, String> {
    fs::create_dir_all(&default_dir).map_err(|e| e.to_string())?;
    let final_path = output_path
        .map(PathBuf::from)
        .unwrap_or_else(|| default_dir.join(default_filename));

    let json = serde_json::to_string_pretty(payload).map_err(|e| e.to_string())?;
    atomic_write(&final_path, &json)?;
    Ok(final_path.to_string_lossy().to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ImportSeriesResult {
    pub series_id: String,
    pub series_title: String,
    pub project_ids: Vec<String>,
    pub imported_project_count: usize,
}

#[tauri::command]
pub fn export_series_backup(
    series_id: String,
    output_path: Option<String>,
) -> Result<String, String> {
    let (series, backup) = build_series_export_payload(&series_id)?;
    let exports_dir = get_series_dir(&series_id)?.join("exports");
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("{}_series_backup_{}.json", slugify(&series.title), ts);
    write_backup_payload(&backup, output_path, exports_dir, filename)
}

#[tauri::command]
pub fn export_series_as_json(series_id: String) -> Result<String, String> {
    let (_, backup) = build_series_export_payload(&series_id)?;
    serde_json::to_string(&backup).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_project_backup(
    project_path: String,
    output_path: Option<String>,
) -> Result<String, String> {
    let project = load_project(&project_path)?;
    let backup = build_project_export_payload(&project)?;
    let exports_dir = PathBuf::from(&project.path).join("exports");
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("{}_backup_{}.json", slugify(&project.title), ts);
    write_backup_payload(&backup, output_path, exports_dir, filename)
}

#[tauri::command]
pub fn export_project_as_json(project_path: String) -> Result<String, String> {
    let project = load_project(&project_path)?;
    let backup = build_project_export_payload(&project)?;
    serde_json::to_string(&backup).map_err(|e| e.to_string())
}

fn get_project_field_string(project_value: &serde_json::Value, key: &str) -> Option<String> {
    project_value
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

fn get_project_field_string_alias(
    project_value: &serde_json::Value,
    snake_key: &str,
    camel_key: &str,
) -> Option<String> {
    get_project_field_string(project_value, snake_key)
        .or_else(|| get_project_field_string(project_value, camel_key))
}

fn require_project_title(
    project_value: &serde_json::Value,
    index: usize,
) -> Result<String, String> {
    let title = get_project_field_string(project_value, "title")
        .map(|v| v.trim().to_string())
        .unwrap_or_default();
    if title.is_empty() {
        return Err(format!(
            "Project payload at index {} is missing title",
            index
        ));
    }
    Ok(title)
}

fn validate_scene_file_name(file_name: &str) -> Result<(), String> {
    let trimmed = file_name.trim();
    if trimmed.is_empty() {
        return Err("Scene file name cannot be empty".to_string());
    }
    validate_no_null_bytes(trimmed, "Scene file name")?;

    let path = Path::new(trimmed);
    if path.is_absolute() {
        return Err("Scene file name must be relative".to_string());
    }

    let mut components = path.components();
    let Some(first) = components.next() else {
        return Err("Scene file name cannot be empty".to_string());
    };
    if components.next().is_some() {
        return Err("Scene file name cannot contain path separators".to_string());
    }
    if !matches!(first, Component::Normal(_)) {
        return Err("Scene file name is invalid".to_string());
    }
    if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err("Scene file name must end with .md".to_string());
    }

    Ok(())
}

fn restore_scene_files(
    project_path: &str,
    scene_files: Option<&serde_json::Map<String, serde_json::Value>>,
) -> Result<(), String> {
    let Some(scene_files) = scene_files else {
        return Ok(());
    };

    let manuscript_dir = PathBuf::from(project_path).join("manuscript");
    fs::create_dir_all(&manuscript_dir).map_err(|e| e.to_string())?;

    for (file_name, value) in scene_files {
        validate_scene_file_name(file_name)?;
        let content = value
            .as_str()
            .ok_or_else(|| format!("Scene file '{}' must be a string", file_name))?;
        let path = manuscript_dir.join(file_name);
        atomic_write(&path, content)?;
    }

    Ok(())
}

fn generate_nodes_from_scene_files(
    scene_files: Option<&serde_json::Map<String, serde_json::Value>>,
) -> Result<Vec<StructureNode>, String> {
    let Some(scene_files) = scene_files else {
        return Ok(Vec::new());
    };

    let mut file_names = scene_files.keys().cloned().collect::<Vec<_>>();
    file_names.sort();

    let mut nodes = Vec::new();
    for (index, file_name) in file_names.into_iter().enumerate() {
        validate_scene_file_name(&file_name)?;
        let id = file_name.trim_end_matches(".md").to_string();
        let title = file_name
            .trim_end_matches(".md")
            .replace(['_', '-'], " ")
            .trim()
            .to_string();
        nodes.push(StructureNode {
            id: if id.is_empty() {
                uuid::Uuid::new_v4().to_string()
            } else {
                id
            },
            node_type: "scene".to_string(),
            title: if title.is_empty() {
                format!("Scene {}", index + 1)
            } else {
                title
            },
            order: index as i32,
            children: Vec::new(),
            file: Some(file_name),
        });
    }

    Ok(nodes)
}

fn parse_snippets(
    project_path: &str,
    new_project_id: &str,
    snippets_value: Option<&Vec<serde_json::Value>>,
) -> Result<(), String> {
    let Some(snippets_value) = snippets_value else {
        return Ok(());
    };

    for (index, value) in snippets_value.iter().enumerate() {
        let mut snippet: Snippet = serde_json::from_value(value.clone())
            .map_err(|e| format!("Invalid snippet payload at index {}: {}", index, e))?;
        snippet.project_id = new_project_id.to_string();
        crate::commands::snippet::save_snippet(project_path.to_string(), snippet)?;
    }

    Ok(())
}

fn list_scene_notes_for_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<SceneNote>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, scene_id, project_id, content_json, created_at, updated_at
            FROM scene_notes
            WHERE project_id = ?1
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare scene note query for backup: {e}"))?;
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
            Ok(SceneNote {
                id: row.get(0)?,
                scene_id: row.get(1)?,
                project_id: row.get(2)?,
                content,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to execute scene note query for backup: {e}"))?;

    let mut notes = Vec::new();
    for row in rows {
        notes.push(row.map_err(|e| format!("Failed to decode scene note row for backup: {e}"))?);
    }
    Ok(notes)
}

fn parse_scene_notes(
    project_path: &str,
    new_project_id: &str,
    scene_notes_value: Option<&Vec<serde_json::Value>>,
) -> Result<(), String> {
    let Some(scene_notes_value) = scene_notes_value else {
        return Ok(());
    };

    for (index, value) in scene_notes_value.iter().enumerate() {
        let mut note: SceneNote = serde_json::from_value(value.clone())
            .map_err(|e| format!("Invalid scene note payload at index {}: {}", index, e))?;
        note.project_id = new_project_id.to_string();
        crate::commands::scene_note::save_scene_note(project_path.to_string(), note)?;
    }

    Ok(())
}

fn parse_chats(
    project_path: &str,
    new_project_id: &str,
    chats_value: Option<&Vec<serde_json::Value>>,
    messages_value: Option<&Vec<serde_json::Value>>,
) -> Result<(), String> {
    let mut thread_ids = HashMap::new();

    if let Some(chats_value) = chats_value {
        for (index, value) in chats_value.iter().enumerate() {
            let mut thread: ChatThread = serde_json::from_value(value.clone())
                .map_err(|e| format!("Invalid chat thread payload at index {}: {}", index, e))?;
            thread.project_id = new_project_id.to_string();
            let created =
                crate::commands::chat::create_chat_thread(project_path.to_string(), thread)?;
            thread_ids.insert(created.id.clone(), true);
        }
    }

    if let Some(messages_value) = messages_value {
        let mut messages = Vec::new();
        for (index, value) in messages_value.iter().enumerate() {
            let message: ChatMessage = serde_json::from_value(value.clone())
                .map_err(|e| format!("Invalid chat message payload at index {}: {}", index, e))?;
            messages.push(message);
        }
        messages.sort_by_key(|message| message.timestamp);

        for message in messages {
            if !thread_ids.contains_key(&message.thread_id) {
                return Err(format!(
                    "Chat message '{}' references missing thread '{}'",
                    message.id, message.thread_id
                ));
            }
            crate::commands::chat::create_chat_message(project_path.to_string(), message)?;
        }
    }

    Ok(())
}

fn parse_codex_entries(
    imported_series_id: &str,
    project_id_map: &HashMap<String, String>,
    codex_values: Option<&Vec<serde_json::Value>>,
) -> Result<(), String> {
    let Some(codex_values) = codex_values else {
        return Ok(());
    };

    for (index, value) in codex_values.iter().enumerate() {
        let mut entry: CodexEntry = serde_json::from_value(value.clone())
            .map_err(|e| format!("Invalid codex entry payload at index {}: {}", index, e))?;
        if let Some(old_project_id) = entry.project_id.clone() {
            entry.project_id = project_id_map.get(&old_project_id).cloned();
        }
        crate::commands::series::save_series_codex_entry(imported_series_id.to_string(), entry)?;
    }

    Ok(())
}

fn parse_codex_relations(
    imported_series_id: &str,
    project_id_map: &HashMap<String, String>,
    relation_values: Option<&Vec<serde_json::Value>>,
) -> Result<(), String> {
    let Some(relation_values) = relation_values else {
        return Ok(());
    };

    for (index, value) in relation_values.iter().enumerate() {
        let mut relation: CodexRelation = serde_json::from_value(value.clone())
            .map_err(|e| format!("Invalid codex relation payload at index {}: {}", index, e))?;
        if let Some(old_project_id) = relation.project_id.clone() {
            relation.project_id = project_id_map.get(&old_project_id).cloned();
        }
        crate::commands::series::save_series_codex_relation(
            imported_series_id.to_string(),
            relation,
        )?;
    }

    Ok(())
}

fn read_project_payload_id(project_payload: &serde_json::Value) -> Option<String> {
    project_payload
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

fn create_project_with_unique_series_index(
    title: String,
    author: String,
    series_id: String,
    requested_series_index: String,
) -> Result<ProjectMeta, String> {
    let base = requested_series_index.trim().to_string();
    let mut candidate = if base.is_empty() {
        "Book 1".to_string()
    } else {
        base.clone()
    };

    for attempt in 0..50 {
        match crate::commands::project::create_project(
            title.clone(),
            author.clone(),
            String::new(),
            series_id.clone(),
            candidate.clone(),
        ) {
            Ok(project) => return Ok(project),
            Err(error) if error.contains("Series index") && error.contains("already exists") => {
                candidate = format!("{} ({})", base, attempt + 2);
            }
            Err(error) => return Err(error),
        }
    }

    Err("Failed to allocate unique series index for imported project".to_string())
}

#[derive(Default)]
struct ImportRollbackContext {
    created_series_id: Option<String>,
    created_project_paths: Vec<String>,
}

fn hard_delete_project_rows(conn: &Connection, project_path: &str) -> Result<(), String> {
    let project_id: Option<String> = conn
        .query_row(
            "SELECT id FROM projects WHERE path = ?1",
            params![project_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to resolve project id for rollback: {e}"))?;

    conn.execute(
        "DELETE FROM recent_projects WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback recent project row: {e}"))?;
    conn.execute(
        "DELETE FROM deleted_projects WHERE original_path = ?1 OR trash_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback deleted project row: {e}"))?;
    conn.execute(
        "DELETE FROM chat_messages WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback chat messages: {e}"))?;
    conn.execute(
        "DELETE FROM chat_threads WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback chat threads: {e}"))?;
    conn.execute(
        "DELETE FROM yjs_snapshots WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback yjs snapshots: {e}"))?;
    conn.execute(
        "DELETE FROM yjs_update_log WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback yjs update log: {e}"))?;
    conn.execute(
        "DELETE FROM search_index WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback search index rows: {e}"))?;
    conn.execute(
        "DELETE FROM search_sync_state WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to rollback search sync rows: {e}"))?;

    if let Some(project_id) = project_id {
        conn.execute(
            "DELETE FROM structure_nodes WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| format!("Failed to rollback structure rows: {e}"))?;
        conn.execute(
            "DELETE FROM scene_metadata WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| format!("Failed to rollback scene metadata rows: {e}"))?;
        conn.execute(
            "DELETE FROM snippets WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| format!("Failed to rollback snippets: {e}"))?;
        conn.execute(
            "DELETE FROM scene_notes WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| format!("Failed to rollback scene notes: {e}"))?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![project_id])
            .map_err(|e| format!("Failed to rollback project row: {e}"))?;
    }

    Ok(())
}

impl ImportRollbackContext {
    fn track_series(&mut self, series_id: String) {
        self.created_series_id = Some(series_id);
    }

    fn track_project_path(&mut self, project_path: String) {
        self.created_project_paths.push(project_path);
    }

    fn rollback(self) {
        let Ok(conn) = open_app_db() else {
            return;
        };

        for project_path in self.created_project_paths.iter().rev() {
            let _ = hard_delete_project_rows(&conn, project_path);
            let project_dir = PathBuf::from(project_path);
            if project_dir.exists() {
                let _ = fs::remove_dir_all(project_dir);
            }
        }

        if let Some(series_id) = self.created_series_id {
            let _ = conn.execute(
                "DELETE FROM codex_entries WHERE series_id = ?1",
                params![series_id],
            );
            let _ = conn.execute(
                "DELETE FROM codex_relations WHERE series_id = ?1",
                params![series_id],
            );
            let _ = conn.execute(
                "DELETE FROM codex_tags WHERE series_id = ?1",
                params![series_id],
            );
            let _ = conn.execute(
                "DELETE FROM codex_entry_tags WHERE series_id = ?1",
                params![series_id],
            );
            let _ = conn.execute(
                "DELETE FROM codex_templates WHERE series_id = ?1",
                params![series_id],
            );
            let _ = conn.execute(
                "DELETE FROM codex_relation_types WHERE series_id = ?1",
                params![series_id],
            );
            let _ = conn.execute(
                "DELETE FROM scene_codex_links WHERE series_id = ?1",
                params![series_id],
            );
            let _ = conn.execute("DELETE FROM series WHERE id = ?1", params![series_id]);
            let _ = conn.execute(
                "DELETE FROM deleted_series_registry WHERE old_series_id = ?1 OR restored_series_id = ?1",
                params![series_id],
            );
        }
    }
}

#[tauri::command]
pub fn import_series_backup(backup_json: String) -> Result<ImportSeriesResult, String> {
    let backup: serde_json::Value =
        serde_json::from_str(&backup_json).map_err(|e| format!("Invalid backup JSON: {}", e))?;

    let backup_type = backup
        .get("backupType")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if backup_type != "series" {
        return Err("Invalid backup: expected a series backup file".to_string());
    }

    let series_data = backup
        .get("series")
        .and_then(|v| v.as_object())
        .ok_or("Missing 'series' field in backup")?;

    let title = series_data
        .get("title")
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or("Missing series title")?;

    let projects = backup
        .get("projects")
        .and_then(|v| v.as_array())
        .ok_or("Missing 'projects' field in backup")?;

    let mut rollback = ImportRollbackContext::default();
    let result = (|| -> Result<ImportSeriesResult, String> {
        let imported_series: Series = crate::commands::series::create_series(
            title,
            series_data
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            series_data
                .get("author")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            series_data
                .get("genre")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            series_data
                .get("status")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        )?;
        rollback.track_series(imported_series.id.clone());

        let mut project_ids = Vec::new();
        let mut project_id_map: HashMap<String, String> = HashMap::new();

        for (index, payload) in projects.iter().enumerate() {
            let project_value = payload
                .get("project")
                .ok_or("Missing project payload in series backup")?;

            let title = require_project_title(project_value, index)?;
            let author = get_project_field_string(project_value, "author").unwrap_or_default();
            let series_index =
                get_project_field_string_alias(project_value, "series_index", "seriesIndex")
                    .unwrap_or_else(|| format!("Book {}", index + 1));

            let mut imported_project = create_project_with_unique_series_index(
                title,
                author,
                imported_series.id.clone(),
                series_index,
            )?;
            rollback.track_project_path(imported_project.path.clone());

            let description =
                get_project_field_string(project_value, "description").unwrap_or_default();
            let archived = project_value
                .get("archived")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let language = get_project_field_string_alias(project_value, "language", "language");
            let cover_image =
                get_project_field_string_alias(project_value, "cover_image", "coverImage");

            let updates = serde_json::json!({
                "description": description,
                "archived": archived,
                "language": language,
                "coverImage": cover_image
            });
            imported_project =
                crate::commands::project::update_project(imported_project.path.clone(), updates)?;

            let scene_files = payload.get("sceneFiles").and_then(|v| v.as_object());
            let mut nodes = payload
                .get("nodes")
                .cloned()
                .map(serde_json::from_value::<Vec<StructureNode>>)
                .transpose()
                .map_err(|e| {
                    format!(
                        "Invalid structure nodes in project payload {}: {}",
                        index, e
                    )
                })?
                .unwrap_or_default();

            if nodes.is_empty() {
                nodes = generate_nodes_from_scene_files(scene_files)?;
            }

            if !nodes.is_empty() {
                crate::commands::project::save_structure(imported_project.path.clone(), nodes)?;
            }

            restore_scene_files(&imported_project.path, scene_files)?;

            parse_snippets(
                &imported_project.path,
                &imported_project.id,
                payload.get("snippets").and_then(|v| v.as_array()),
            )?;
            parse_scene_notes(
                &imported_project.path,
                &imported_project.id,
                payload.get("sceneNotes").and_then(|v| v.as_array()),
            )?;
            parse_chats(
                &imported_project.path,
                &imported_project.id,
                payload.get("chats").and_then(|v| v.as_array()),
                payload.get("messages").and_then(|v| v.as_array()),
            )?;

            if let Some(old_project_id) = read_project_payload_id(project_value) {
                project_id_map.insert(old_project_id, imported_project.id.clone());
            }
            project_ids.push(imported_project.id.clone());
        }

        parse_codex_entries(
            &imported_series.id,
            &project_id_map,
            backup.get("codex").and_then(|v| v.as_array()),
        )?;
        parse_codex_relations(
            &imported_series.id,
            &project_id_map,
            backup.get("codexRelations").and_then(|v| v.as_array()),
        )?;

        Ok(ImportSeriesResult {
            series_id: imported_series.id,
            series_title: imported_series.title,
            imported_project_count: project_ids.len(),
            project_ids,
        })
    })();

    if result.is_err() {
        rollback.rollback();
    }

    result
}

/// Write export file data to the specified path
/// Used by frontend to save generated export files to user-selected location
#[tauri::command]
pub fn write_export_file(file_path: String, data: Vec<u8>) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&path, data).map_err(|e| e.to_string())?;

    Ok(())
}
