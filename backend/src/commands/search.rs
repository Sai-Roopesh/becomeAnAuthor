// Search commands

use rusqlite::params;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

use crate::models::{ProjectMeta, StructureNode};
use crate::storage::{
    clear_search_index, get_search_signature, open_app_db, set_search_signature,
    upsert_search_document,
};
use crate::utils::{get_series_codex_path, timestamp};

fn strip_frontmatter(content: &str) -> String {
    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() >= 3 {
        parts[2].trim().to_string()
    } else {
        content.to_string()
    }
}

fn collect_scene_nodes(nodes: &[StructureNode], out: &mut Vec<(String, String, String)>) {
    for node in nodes {
        if node.node_type == "scene" {
            if let Some(file) = &node.file {
                out.push((node.id.clone(), node.title.clone(), file.clone()));
            }
        }
        collect_scene_nodes(&node.children, out);
    }
}

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

fn collect_files_by_extension(root: &Path, extension: &str) -> Vec<PathBuf> {
    if !root.exists() {
        return Vec::new();
    }
    let mut files = WalkDir::new(root)
        .into_iter()
        .flatten()
        .filter(|entry| entry.file_type().is_file())
        .filter(|entry| entry.path().extension().is_some_and(|ext| ext == extension))
        .map(|entry| entry.path().to_path_buf())
        .collect::<Vec<_>>();
    files.sort();
    files
}

fn compute_search_signature(project_path: &str, series_id: &str) -> Result<String, String> {
    let mut hasher = DefaultHasher::new();
    project_path.hash(&mut hasher);
    series_id.hash(&mut hasher);

    let project_root = PathBuf::from(project_path);
    let structure_path = project_root.join(".meta/structure.json");
    if structure_path.exists() {
        add_path_metadata_fingerprint(&structure_path, &mut hasher)?;
    }
    let project_meta_path = project_root.join(".meta/project.json");
    if project_meta_path.exists() {
        add_path_metadata_fingerprint(&project_meta_path, &mut hasher)?;
    }

    let manuscript_files = collect_files_by_extension(&project_root.join("manuscript"), "md");
    manuscript_files.len().hash(&mut hasher);
    for file in manuscript_files {
        add_path_metadata_fingerprint(&file, &mut hasher)?;
    }

    let codex_root = get_series_codex_path(series_id)?;
    let codex_files = collect_files_by_extension(&codex_root, "json");
    codex_files.len().hash(&mut hasher);
    for file in codex_files {
        add_path_metadata_fingerprint(&file, &mut hasher)?;
    }

    Ok(format!("{:x}", hasher.finish()))
}

fn rebuild_search_index_for_project(
    project_path: &str,
    series_id: &str,
    signature: &str,
) -> Result<(), String> {
    let conn = open_app_db()?;
    clear_search_index(&conn, project_path)?;

    let structure = crate::commands::project::get_structure(project_path.to_string())?;
    let mut scene_nodes = Vec::new();
    collect_scene_nodes(&structure, &mut scene_nodes);
    for (scene_id, scene_title, scene_file) in scene_nodes {
        let scene_path = PathBuf::from(project_path).join("manuscript").join(&scene_file);
        let raw = fs::read_to_string(&scene_path).map_err(|e| {
            format!(
                "Failed to read scene '{}' for search indexing: {}",
                scene_path.display(),
                e
            )
        })?;
        let body = strip_frontmatter(&raw);
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

    let codex_dir = get_series_codex_path(series_id)?;
    if codex_dir.exists() {
        for entry in WalkDir::new(&codex_dir)
            .min_depth(2)
            .max_depth(2)
            .into_iter()
            .flatten()
        {
            let path = entry.path();
            if !entry.file_type().is_file() || !path.extension().is_some_and(|e| e == "json") {
                continue;
            }

            let raw = fs::read_to_string(path).map_err(|e| {
                format!(
                    "Failed to read codex entry '{}' for search indexing: {}",
                    path.display(),
                    e
                )
            })?;
            let parsed: serde_json::Value = serde_json::from_str(&raw).map_err(|e| {
                format!(
                    "Failed to parse codex entry '{}' for search indexing: {}",
                    path.display(),
                    e
                )
            })?;
            let entry_id = parsed
                .get("id")
                .and_then(|value| value.as_str())
                .map(ToString::to_string)
                .or_else(|| {
                    path.file_stem()
                        .and_then(|value| value.to_str())
                        .map(ToString::to_string)
                })
                .ok_or_else(|| {
                    format!("Codex entry '{}' is missing an id and a valid filename", path.display())
                })?;
            let entry_title = parsed
                .get("name")
                .and_then(|value| value.as_str())
                .unwrap_or("Untitled Codex Entry");
            let category = parsed
                .get("category")
                .and_then(|value| value.as_str())
                .unwrap_or("unknown");
            let description = parsed
                .get("description")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            let body = if description.trim().is_empty() {
                raw.as_str()
            } else {
                description
            };
            upsert_search_document(
                &conn,
                project_path,
                "codex",
                &entry_id,
                entry_title,
                body,
                Some(category),
                &path.to_string_lossy(),
            )?;
        }
    }

    set_search_signature(&conn, project_path, signature, timestamp::now_millis())?;
    Ok(())
}

fn ensure_search_index(project_path: &str) -> Result<(), String> {
    let meta_path = PathBuf::from(project_path).join(".meta/project.json");
    let meta_content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read project metadata '{}': {}", meta_path.display(), e))?;
    let project_meta: ProjectMeta = serde_json::from_str(&meta_content)
        .map_err(|e| format!("Failed to parse project metadata '{}': {}", meta_path.display(), e))?;

    let signature = compute_search_signature(project_path, &project_meta.series_id)?;
    let conn = open_app_db()?;
    let existing_signature = get_search_signature(&conn, project_path)?;
    if existing_signature.as_deref() != Some(signature.as_str()) {
        rebuild_search_index_for_project(project_path, &project_meta.series_id, &signature)?;
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
        let id: String = row.get(0).map_err(|e| format!("Invalid search row id: {}", e))?;
        let title: String = row.get(1).map_err(|e| format!("Invalid search row title: {}", e))?;
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

        let content_type = if doc_type == "scene" { "scene" } else { "codex" };
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
