// Backup and export commands

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use crate::commands::backup_manuscript::collect_scene_files;
use crate::models::{CodexRelation, ProjectMeta, Series, StructureNode};
use crate::utils::{
    atomic_write, get_projects_dir, get_series_codex_path, get_series_dir, get_series_path,
    sanitize_path_component, slugify, timestamp, validate_no_null_bytes, validate_uuid_format,
};

fn build_project_backup_payload(project: &ProjectMeta) -> Result<serde_json::Value, String> {
    let structure = crate::commands::project::get_structure(project.path.clone())?;
    let snippets = crate::commands::snippet::list_snippets(project.path.clone())?;
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
        "chats": chats,
        "messages": messages
    }))
}

fn load_project_meta(project_path: &str) -> Result<ProjectMeta, String> {
    let meta_path = PathBuf::from(project_path).join(".meta/project.json");
    if !meta_path.exists() {
        return Err("Project not found".to_string());
    }

    let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn build_project_export_payload(project: &ProjectMeta) -> Result<serde_json::Value, String> {
    let structure = crate::commands::project::get_structure(project.path.clone())?;
    let scene_files = collect_scene_files(&project.path, &structure);
    let codex =
        crate::commands::series::list_series_codex_entries(project.series_id.clone(), None)?;
    let snippets = crate::commands::snippet::list_snippets(project.path.clone())?;

    Ok(serde_json::json!({
        "version": 2,
        "backupType": "project",
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "project": project,
        "nodes": structure,
        "sceneFiles": scene_files,
        "codex": codex,
        "snippets": snippets
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
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!(
        "{}_series_backup_{}.json",
        slugify(&series.title),
        timestamp
    );
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
    let project = load_project_meta(&project_path)?;
    let backup = build_project_export_payload(&project)?;
    let exports_dir = PathBuf::from(&project.path).join("exports");
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("{}_backup_{}.json", slugify(&project.title), timestamp);
    write_backup_payload(&backup, output_path, exports_dir, filename)
}

/// Export project as JSON string (for cloud backup services like Google Drive)
#[tauri::command]
pub fn export_project_as_json(project_path: String) -> Result<String, String> {
    let project = load_project_meta(&project_path)?;
    let backup = build_project_export_payload(&project)?;
    serde_json::to_string(&backup).map_err(|e| e.to_string())
}

fn create_project_directory_structure(project_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(project_dir.join(".meta/chat/messages")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("manuscript")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("snippets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("exports")).map_err(|e| e.to_string())?;
    Ok(())
}

const ALLOWED_CODEX_CATEGORIES: [&str; 5] = ["character", "location", "item", "lore", "subplot"];

#[derive(Default)]
struct ImportRollbackContext {
    created_series_id: Option<String>,
    created_project_paths: Vec<PathBuf>,
}

impl ImportRollbackContext {
    fn track_series(&mut self, series_id: String) {
        self.created_series_id = Some(series_id);
    }

    fn track_project_path(&mut self, project_path: PathBuf) {
        self.created_project_paths.push(project_path);
    }

    fn rollback(self) {
        for project_dir in self.created_project_paths.iter().rev() {
            let project_path = project_dir.to_string_lossy().to_string();
            let _ = crate::commands::project::remove_from_recent(project_path.clone());
            let _ = crate::commands::project::unregister_project_path(&project_path);
            let _ = fs::remove_dir_all(project_dir);
        }

        if let Some(series_id) = self.created_series_id {
            let _ = remove_series_record(&series_id);
            if let Ok(series_dir) = get_series_dir(&series_id) {
                let _ = fs::remove_dir_all(series_dir);
            }
        }
    }
}

fn remove_series_record(series_id: &str) -> Result<(), String> {
    let series_path = get_series_path()?;
    if !series_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&series_path).map_err(|e| e.to_string())?;
    let mut all_series: Vec<Series> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse series registry while rolling back import: {}", e))?;
    let original_len = all_series.len();
    all_series.retain(|series| series.id != series_id);
    if all_series.len() == original_len {
        return Ok(());
    }

    let json = serde_json::to_string_pretty(&all_series).map_err(|e| e.to_string())?;
    atomic_write(&series_path, &json)
}

fn validate_safe_file_name(value: &str, field_name: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{} cannot be empty", field_name));
    }
    validate_no_null_bytes(trimmed, field_name)?;

    let path = Path::new(trimmed);
    if path.components().count() != 1
        || path.file_name().and_then(|name| name.to_str()) != Some(trimmed)
    {
        return Err(format!("{} contains an invalid path", field_name));
    }

    if trimmed.starts_with('.') {
        return Err(format!("{} cannot start with '.'", field_name));
    }

    if !trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_'))
    {
        return Err(format!("{} contains unsupported characters", field_name));
    }

    Ok(trimmed.to_string())
}

fn validate_scene_file_name(value: &str) -> Result<String, String> {
    let file_name = validate_safe_file_name(value, "Scene file name")?;
    if !file_name.ends_with(".md") {
        return Err("Scene file name must end with .md".to_string());
    }
    Ok(file_name)
}

fn validate_uuid_identifier(value: &str, field_name: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{} cannot be empty", field_name));
    }
    validate_no_null_bytes(trimmed, field_name)?;
    validate_uuid_format(trimmed).map_err(|_| format!("{} must be a valid UUID", field_name))?;
    Ok(trimmed.to_string())
}

fn normalize_codex_category(value: Option<&str>) -> String {
    let sanitized = sanitize_path_component(value.unwrap_or("lore"));
    if ALLOWED_CODEX_CATEGORIES.contains(&sanitized.as_str()) {
        sanitized
    } else {
        "lore".to_string()
    }
}

fn validate_scene_files_in_nodes(nodes: &[StructureNode]) -> Result<(), String> {
    fn walk(nodes: &[StructureNode]) -> Result<(), String> {
        for node in nodes {
            if let Some(file_name) = &node.file {
                validate_scene_file_name(file_name)?;
            }
            if !node.children.is_empty() {
                walk(&node.children)?;
            }
        }
        Ok(())
    }

    walk(nodes)
}

fn restore_scene_files(
    project_dir: &Path,
    scene_files: Option<&serde_json::Map<String, serde_json::Value>>,
) -> Result<(), String> {
    if let Some(files) = scene_files {
        for (file_name, content_value) in files {
            let content = content_value.as_str().ok_or_else(|| {
                format!(
                    "Scene file '{}' must contain string content in backup",
                    file_name
                )
            })?;
            let safe_file_name = validate_scene_file_name(file_name)?;
            let path = project_dir.join("manuscript").join(safe_file_name);
            atomic_write(&path, content)?;
        }
    }
    Ok(())
}

fn validate_scene_files_exist(project_dir: &Path, nodes: &[StructureNode]) -> Result<(), String> {
    fn walk(project_dir: &Path, nodes: &[StructureNode]) -> Result<(), String> {
        for node in nodes {
            if let Some(file_name) = &node.file {
                let safe_file_name = validate_scene_file_name(file_name)?;
                let path = project_dir.join("manuscript").join(safe_file_name);
                if !path.exists() {
                    return Err(format!(
                        "Missing scene file '{}' required by structure node '{}'",
                        file_name, node.id
                    ));
                }
            }
            if !node.children.is_empty() {
                walk(project_dir, &node.children)?;
            }
        }
        Ok(())
    }

    walk(project_dir, nodes)
}

fn restore_snippets(
    project_dir: &Path,
    snippets: Option<&Vec<serde_json::Value>>,
    project_id: &str,
) -> Result<(), String> {
    if let Some(snippets) = snippets {
        for (index, snippet) in snippets.iter().enumerate() {
            let obj = snippet.as_object().ok_or_else(|| {
                format!("Snippet payload at index {} must be a JSON object", index)
            })?;
            let id = obj
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Snippet payload at index {} is missing 'id'", index))?;

            let safe_id = validate_uuid_identifier(id, "Snippet id")?;
            let mut snippet_clone = snippet.clone();
            if let Some(snippet_obj) = snippet_clone.as_object_mut() {
                snippet_obj.insert(
                    "projectId".to_string(),
                    serde_json::Value::String(project_id.to_string()),
                );
            }
            let snippet_path = project_dir.join("snippets").join(format!("{}.json", safe_id));
            let json = serde_json::to_string_pretty(&snippet_clone).map_err(|e| e.to_string())?;
            atomic_write(&snippet_path, &json)?;
        }
    }
    Ok(())
}

fn parse_required_timestamp(
    value: Option<&serde_json::Value>,
    field_name: &str,
) -> Result<i64, String> {
    let Some(raw_value) = value else {
        return Err(format!("Missing required timestamp field '{}'", field_name));
    };

    if let Some(ts) = raw_value.as_i64() {
        return Ok(ts);
    }

    if let Some(ts) = raw_value.as_u64() {
        return i64::try_from(ts)
            .map_err(|_| format!("Timestamp field '{}' exceeds i64 range", field_name));
    }

    Err(format!(
        "Timestamp field '{}' must be an integer",
        field_name
    ))
}

fn restore_chats(
    project_dir: &Path,
    chats: Option<&Vec<serde_json::Value>>,
    messages: Option<&Vec<serde_json::Value>>,
    project_id: &str,
) -> Result<(), String> {
    let chat_root = project_dir.join(".meta/chat");
    let messages_dir = chat_root.join("messages");
    fs::create_dir_all(&messages_dir).map_err(|e| e.to_string())?;

    let mut threads: Vec<serde_json::Value> = Vec::new();
    let mut thread_ids: Vec<String> = Vec::new();
    let mut thread_id_set: HashSet<String> = HashSet::new();
    let mut thread_max_timestamp: HashMap<String, i64> = HashMap::new();
    let mut grouped_messages: HashMap<String, Vec<serde_json::Value>> = HashMap::new();

    if let Some(message_values) = messages {
        for (index, message) in message_values.iter().enumerate() {
            let mut obj = message.as_object().cloned().ok_or_else(|| {
                format!("Chat message at index {} must be a JSON object", index)
            })?;

            let thread_id_raw = obj
                .get("threadId")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Chat message at index {} is missing 'threadId'", index))?;
            let thread_id = validate_uuid_identifier(thread_id_raw, "Chat thread id")?;

            let message_id_raw = obj
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Chat message at index {} is missing 'id'", index))?;
            let message_id = validate_uuid_identifier(message_id_raw, "Chat message id")?;
            obj.insert("id".to_string(), serde_json::Value::String(message_id));

            let role = obj
                .get("role")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Chat message at index {} is missing 'role'", index))?;
            let normalized_role = if role.eq_ignore_ascii_case("assistant") {
                "assistant"
            } else if role.eq_ignore_ascii_case("user") {
                "user"
            } else {
                return Err(format!(
                    "Chat message at index {} has unsupported role '{}'",
                    index, role
                ));
            };
            obj.insert(
                "role".to_string(),
                serde_json::Value::String(normalized_role.to_string()),
            );

            let content = obj
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Chat message at index {} is missing 'content'", index))?;
            obj.insert(
                "content".to_string(),
                serde_json::Value::String(content.to_string()),
            );

            let ts = parse_required_timestamp(obj.get("timestamp"), "timestamp")?;
            obj.insert(
                "timestamp".to_string(),
                serde_json::Value::Number(serde_json::Number::from(ts)),
            );

            grouped_messages
                .entry(thread_id.clone())
                .or_default()
                .push(serde_json::Value::Object(obj));
            thread_max_timestamp
                .entry(thread_id)
                .and_modify(|current| {
                    if ts > *current {
                        *current = ts;
                    }
                })
                .or_insert(ts);
        }
    }

    if let Some(chat_values) = chats {
        for (index, chat) in chat_values.iter().enumerate() {
            let mut obj = chat
                .as_object()
                .cloned()
                .ok_or_else(|| format!("Chat thread at index {} must be a JSON object", index))?;

            let thread_id_raw = obj
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Chat thread at index {} is missing 'id'", index))?;
            let thread_id = validate_uuid_identifier(thread_id_raw, "Chat thread id")?;
            if thread_id_set.contains(&thread_id) {
                return Err(format!("Duplicate chat thread id '{}'", thread_id));
            }

            obj.insert(
                "projectId".to_string(),
                serde_json::Value::String(project_id.to_string()),
            );

            let name = obj
                .get("name")
                .and_then(|v| v.as_str())
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .ok_or_else(|| format!("Chat thread '{}' is missing a valid 'name'", thread_id))?;
            obj.insert(
                "name".to_string(),
                serde_json::Value::String(name.to_string()),
            );

            if let Some(pinned) = obj.get("pinned") {
                if !pinned.is_boolean() {
                    return Err(format!(
                        "Chat thread '{}' field 'pinned' must be boolean",
                        thread_id
                    ));
                }
            } else {
                obj.insert("pinned".to_string(), serde_json::Value::Bool(false));
            }

            if let Some(archived) = obj.get("archived") {
                if !archived.is_boolean() {
                    return Err(format!(
                        "Chat thread '{}' field 'archived' must be boolean",
                        thread_id
                    ));
                }
            } else {
                obj.insert("archived".to_string(), serde_json::Value::Bool(false));
            }

            let created_at = parse_required_timestamp(obj.get("createdAt"), "createdAt")?;
            let mut updated_at = parse_required_timestamp(obj.get("updatedAt"), "updatedAt")?;
            if let Some(max_ts) = thread_max_timestamp.get(&thread_id) {
                if *max_ts > updated_at {
                    updated_at = *max_ts;
                }
            }

            obj.insert(
                "createdAt".to_string(),
                serde_json::Value::Number(serde_json::Number::from(created_at)),
            );
            obj.insert(
                "updatedAt".to_string(),
                serde_json::Value::Number(serde_json::Number::from(updated_at)),
            );

            thread_id_set.insert(thread_id.clone());
            thread_ids.push(thread_id);
            threads.push(serde_json::Value::Object(obj));
        }
    }

    for thread_id in grouped_messages.keys() {
        if !thread_id_set.contains(thread_id) {
            return Err(format!(
                "Chat messages reference unknown chat thread '{}'",
                thread_id
            ));
        }
    }

    let threads_json = serde_json::to_string_pretty(&threads).map_err(|e| e.to_string())?;
    atomic_write(&chat_root.join("threads.json"), &threads_json)?;

    for thread_id in thread_ids {
        let mut thread_messages = grouped_messages.remove(&thread_id).unwrap_or_default();
        thread_messages.sort_by_key(|msg| {
            msg.get("timestamp")
                .and_then(|v| v.as_i64())
                .unwrap_or(i64::MIN)
        });
        let json = serde_json::to_string_pretty(&thread_messages).map_err(|e| e.to_string())?;
        atomic_write(&messages_dir.join(format!("{}.json", thread_id)), &json)?;
    }

    Ok(())
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
        .ok_or("Missing 'series' field in backup")?;

    let title = series_data
        .get("title")
        .and_then(|v| v.as_str())
        .ok_or("Missing series title")?;

    let projects = backup
        .get("projects")
        .and_then(|v| v.as_array())
        .ok_or("Missing 'projects' field in backup")?;

    let mut rollback = ImportRollbackContext::default();
    let result = (|| -> Result<ImportSeriesResult, String> {
        let imported_series: Series = crate::commands::series::create_series(
            title.to_string(),
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

        let projects_dir = get_projects_dir()?;
        let mut project_ids = Vec::new();
        let mut project_id_map: HashMap<String, String> = HashMap::new();

        for (index, payload) in projects.iter().enumerate() {
            let source_project_value = payload
                .get("project")
                .ok_or("Missing project payload in series backup")?;
            let source_project: ProjectMeta =
                serde_json::from_value(source_project_value.clone()).map_err(|e| e.to_string())?;

            let timestamp_str = chrono::Utc::now().format("%Y%m%d%H%M%S");
            let slug = format!(
                "{}_{}_{}",
                slugify(&source_project.title),
                timestamp_str,
                index + 1
            );
            let project_dir = projects_dir.join(&slug);
            create_project_directory_structure(&project_dir)?;
            rollback.track_project_path(project_dir.clone());

            let new_id = uuid::Uuid::new_v4().to_string();
            let now = timestamp::now_millis();
            let imported_project = ProjectMeta {
                id: new_id.clone(),
                title: source_project.title.clone(),
                author: source_project.author.clone(),
                description: source_project.description.clone(),
                archived: source_project.archived,
                language: source_project.language.clone(),
                cover_image: source_project.cover_image.clone(),
                series_id: imported_series.id.clone(),
                series_index: source_project.series_index.clone(),
                path: project_dir.to_string_lossy().to_string(),
                created_at: now,
                updated_at: now,
            };

            let project_json =
                serde_json::to_string_pretty(&imported_project).map_err(|e| e.to_string())?;
            atomic_write(&project_dir.join(".meta/project.json"), &project_json)?;

            let nodes_value = payload
                .get("nodes")
                .ok_or("Missing project nodes in series backup")?
                .clone();
            let nodes: Vec<StructureNode> = serde_json::from_value(nodes_value)
                .map_err(|e| format!("Invalid project structure nodes: {}", e))?;
            validate_scene_files_in_nodes(&nodes)?;
            let structure_json = serde_json::to_string_pretty(&nodes).map_err(|e| e.to_string())?;
            atomic_write(&project_dir.join(".meta/structure.json"), &structure_json)?;

            let scene_files = payload.get("sceneFiles").and_then(|v| v.as_object());
            restore_scene_files(&project_dir, scene_files)?;
            validate_scene_files_exist(&project_dir, &nodes)?;

            let snippets = payload.get("snippets").and_then(|v| v.as_array());
            restore_snippets(&project_dir, snippets, &new_id)?;
            let chats = payload.get("chats").and_then(|v| v.as_array());
            let messages = payload.get("messages").and_then(|v| v.as_array());
            restore_chats(&project_dir, chats, messages, &new_id)?;

            crate::commands::project::add_to_recent(
                imported_project.path.clone(),
                imported_project.title.clone(),
            )?;

            project_id_map.insert(source_project.id.clone(), new_id.clone());
            project_ids.push(new_id);
        }

        if let Some(codex_entries) = backup.get("codex").and_then(|v| v.as_array()) {
            let series_codex_dir = get_series_codex_path(&imported_series.id)?;
            for entry in codex_entries {
                let category =
                    normalize_codex_category(entry.get("category").and_then(|v| v.as_str()));
                let entry_id = entry
                    .get("id")
                    .and_then(|v| v.as_str())
                    .ok_or("Codex entry missing id")?;
                let safe_entry_id = validate_uuid_identifier(entry_id, "Codex entry id")?;

                let mut entry_clone = entry.clone();
                if let Some(obj) = entry_clone.as_object_mut() {
                    obj.insert(
                        "seriesId".to_string(),
                        serde_json::Value::String(imported_series.id.clone()),
                    );

                    if let Some(old_project_id) = obj.get("projectId").and_then(|v| v.as_str()) {
                        if let Some(new_project_id) = project_id_map.get(old_project_id) {
                            obj.insert(
                                "projectId".to_string(),
                                serde_json::Value::String(new_project_id.clone()),
                            );
                        }
                    }
                }

                let category_dir = series_codex_dir.join(category);
                fs::create_dir_all(&category_dir).map_err(|e| e.to_string())?;
                let entry_path = category_dir.join(format!("{}.json", safe_entry_id));
                let json = serde_json::to_string_pretty(&entry_clone).map_err(|e| e.to_string())?;
                atomic_write(&entry_path, &json)?;
            }
        }

        let relations_path = get_series_dir(&imported_series.id)?.join("codex_relations.json");
        let mut relations: Vec<CodexRelation> = Vec::new();
        if let Some(raw_relations) = backup.get("codexRelations").and_then(|v| v.as_array()) {
            for relation in raw_relations {
                let mut relation_clone = relation.clone();
                if let Some(obj) = relation_clone.as_object_mut() {
                    if let Some(old_project_id) = obj.get("projectId").and_then(|v| v.as_str()) {
                        if let Some(new_project_id) = project_id_map.get(old_project_id) {
                            obj.insert(
                                "projectId".to_string(),
                                serde_json::Value::String(new_project_id.clone()),
                            );
                        } else {
                            obj.remove("projectId");
                        }
                    }
                }

                let parsed = serde_json::from_value::<CodexRelation>(relation_clone)
                    .map_err(|e| format!("Invalid codex relation in backup: {}", e))?;
                relations.push(parsed);
            }
        }
        let relations_json = serde_json::to_string_pretty(&relations).map_err(|e| e.to_string())?;
        atomic_write(&relations_path, &relations_json)?;

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

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&path, data).map_err(|e| e.to_string())?;

    Ok(())
}
