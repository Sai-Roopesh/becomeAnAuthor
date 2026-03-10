// Project commands (SQLite-backed metadata + filesystem manuscript/project dirs)

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::models::{ProjectMeta, StructureNode};
use crate::storage::open_app_db;
use crate::utils::{
    get_app_dir, get_projects_dir, slugify, timestamp, validate_project_creation,
    validate_project_title,
};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub path: String,
    pub title: String,
    #[serde(alias = "last_opened")]
    pub last_opened: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrashedProject {
    pub id: String,
    pub title: String,
    pub original_path: String,
    pub trash_path: String,
    pub deleted_at: i64,
}

#[derive(Debug, Clone)]
struct StructureNodeRow {
    id: String,
    parent_id: Option<String>,
    node_type: String,
    title: String,
    order_index: i32,
    scene_file: Option<String>,
}

fn get_projects_trash_dir() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    Ok(app_dir.join("Trash"))
}

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn row_to_project(row: &rusqlite::Row<'_>) -> Result<ProjectMeta, rusqlite::Error> {
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

fn get_project_by_path(conn: &Connection, project_path: &str) -> Result<ProjectMeta, String> {
    conn.query_row(
        r#"
        SELECT id, title, author, description, path, archived, language, cover_image,
               series_id, series_index, created_at, updated_at
        FROM projects
        WHERE path = ?1
        "#,
        params![project_path],
        row_to_project,
    )
    .optional()
    .map_err(|e| format!("Failed to load project by path: {e}"))?
    .ok_or_else(|| "Project not found".to_string())
}

fn upsert_project(conn: &Connection, project: &ProjectMeta) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO projects(
            id, path, title, author, description, archived, language, cover_image,
            series_id, series_index, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
        ON CONFLICT(id) DO UPDATE SET
            path = excluded.path,
            title = excluded.title,
            author = excluded.author,
            description = excluded.description,
            archived = excluded.archived,
            language = excluded.language,
            cover_image = excluded.cover_image,
            series_id = excluded.series_id,
            series_index = excluded.series_index,
            updated_at = excluded.updated_at
        "#,
        params![
            project.id,
            project.path,
            project.title,
            project.author,
            project.description,
            bool_to_sql(project.archived),
            project.language,
            project.cover_image,
            project.series_id,
            project.series_index,
            project.created_at,
            project.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to upsert project: {e}"))?;
    Ok(())
}

fn ensure_unique_series_index(
    conn: &Connection,
    series_id: &str,
    series_index: &str,
    exclude_project_id: Option<&str>,
) -> Result<(), String> {
    let count: i64 = if let Some(exclude) = exclude_project_id {
        conn.query_row(
            "SELECT COUNT(1) FROM projects WHERE series_id = ?1 AND series_index = ?2 AND id != ?3",
            params![series_id, series_index, exclude],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate series index uniqueness: {e}"))?
    } else {
        conn.query_row(
            "SELECT COUNT(1) FROM projects WHERE series_id = ?1 AND series_index = ?2",
            params![series_id, series_index],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate series index uniqueness: {e}"))?
    };

    if count > 0 {
        return Err(format!(
            "Series index '{}' already exists in this series",
            series_index
        ));
    }
    Ok(())
}

fn ensure_series_exists(conn: &Connection, series_id: &str) -> Result<(), String> {
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM series WHERE id = ?1)",
            params![series_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate series id: {e}"))?;
    if !exists {
        return Err("Series not found".to_string());
    }
    Ok(())
}

fn ensure_recovery_series(conn: &Connection) -> Result<String, String> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM series WHERE title = 'Recovered Projects' ORDER BY updated_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to lookup recovery series: {e}"))?;
    if let Some(series_id) = existing {
        return Ok(series_id);
    }

    let created = crate::commands::series::create_series(
        "Recovered Projects".to_string(),
        Some("Auto-created fallback series for restored projects.".to_string()),
        None,
        None,
        None,
    )?;
    Ok(created.id)
}

fn resolve_series_for_restored_project(
    conn: &Connection,
    original_series_id: &str,
) -> Result<String, String> {
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM series WHERE id = ?1)",
            params![original_series_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check series existence: {e}"))?;
    if exists {
        return Ok(original_series_id.to_string());
    }

    if let Some(recreated_id) =
        crate::commands::series::restore_or_recreate_deleted_series(original_series_id)?
    {
        return Ok(recreated_id);
    }

    ensure_recovery_series(conn)
}

fn add_recent_entry(conn: &Connection, project_path: &str, title: &str) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO recent_projects(project_path, title, last_opened)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(project_path) DO UPDATE SET
            title = excluded.title,
            last_opened = excluded.last_opened
        "#,
        params![project_path, title, timestamp::now_millis()],
    )
    .map_err(|e| format!("Failed to upsert recent project: {e}"))?;
    Ok(())
}

fn fetch_structure_rows(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<StructureNodeRow>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, parent_id, node_type, title, order_index, scene_file
            FROM structure_nodes
            WHERE project_id = ?1
            ORDER BY order_index ASC
            "#,
        )
        .map_err(|e| format!("Failed to prepare structure query: {e}"))?;

    let rows = stmt
        .query_map(params![project_id], |row| {
            Ok(StructureNodeRow {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                node_type: row.get(2)?,
                title: row.get(3)?,
                order_index: row.get(4)?,
                scene_file: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to execute structure query: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("Failed to decode structure row: {e}"))?);
    }
    Ok(result)
}

fn build_structure_tree(rows: Vec<StructureNodeRow>) -> Vec<StructureNode> {
    let mut grouped: HashMap<Option<String>, Vec<StructureNodeRow>> = HashMap::new();
    for row in rows {
        grouped.entry(row.parent_id.clone()).or_default().push(row);
    }

    fn build_nodes(
        grouped: &mut HashMap<Option<String>, Vec<StructureNodeRow>>,
        parent_id: Option<String>,
    ) -> Vec<StructureNode> {
        let mut current = grouped.remove(&parent_id).unwrap_or_default();
        current.sort_by(|a, b| a.order_index.cmp(&b.order_index));

        current
            .into_iter()
            .map(|row| StructureNode {
                id: row.id.clone(),
                node_type: row.node_type,
                title: row.title,
                order: row.order_index,
                file: row.scene_file,
                children: build_nodes(grouped, Some(row.id)),
            })
            .collect()
    }

    build_nodes(&mut grouped, None)
}

#[allow(clippy::type_complexity)]
fn flatten_structure_nodes(
    nodes: &[StructureNode],
    parent_id: Option<&str>,
    output: &mut Vec<(String, Option<String>, String, String, i32, Option<String>)>,
) {
    for (index, node) in nodes.iter().enumerate() {
        let order_index = if node.order >= 0 {
            node.order
        } else {
            index as i32
        };
        output.push((
            node.id.clone(),
            parent_id.map(ToString::to_string),
            node.node_type.clone(),
            node.title.clone(),
            order_index,
            node.file.clone(),
        ));
        flatten_structure_nodes(&node.children, Some(&node.id), output);
    }
}

fn collect_scene_nodes(nodes: &[StructureNode], scene_nodes: &mut Vec<(String, String, i32)>) {
    for node in nodes {
        if node.node_type == "scene" {
            if let Some(file) = &node.file {
                scene_nodes.push((node.id.clone(), file.clone(), node.order));
            }
        }
        collect_scene_nodes(&node.children, scene_nodes);
    }
}

fn sync_scene_metadata_from_structure(
    conn: &Connection,
    project_id: &str,
    structure: &[StructureNode],
) -> Result<(), String> {
    let mut scene_nodes = Vec::new();
    collect_scene_nodes(structure, &mut scene_nodes);
    let now = timestamp::now_millis();

    for (scene_id, scene_file, order_index) in &scene_nodes {
        let existing_created_at: Option<i64> = conn
            .query_row(
                "SELECT created_at FROM scene_metadata WHERE scene_id = ?1",
                params![scene_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Failed to read scene metadata timestamp: {e}"))?;

        let title: String = conn
            .query_row(
                "SELECT title FROM structure_nodes WHERE id = ?1",
                params![scene_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to resolve scene title from structure: {e}"))?;

        conn.execute(
            r#"
            INSERT INTO scene_metadata(
                scene_id, project_id, scene_file, title, order_index, status, word_count,
                pov_character, subtitle, labels_json, exclude_from_ai, summary, archived,
                created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, 'draft', 0, NULL, NULL, '[]', 0, '', 0, ?6, ?7)
            ON CONFLICT(scene_id) DO UPDATE SET
                project_id = excluded.project_id,
                scene_file = excluded.scene_file,
                title = excluded.title,
                order_index = excluded.order_index,
                updated_at = excluded.updated_at
            "#,
            params![
                scene_id,
                project_id,
                scene_file,
                title,
                order_index,
                existing_created_at.unwrap_or(now),
                now,
            ],
        )
        .map_err(|e| format!("Failed to upsert scene metadata from structure: {e}"))?;
    }

    if scene_nodes.is_empty() {
        conn.execute(
            "DELETE FROM scene_metadata WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| format!("Failed to clear stale scene metadata: {e}"))?;
        return Ok(());
    }

    let placeholders = vec!["?"; scene_nodes.len()].join(",");
    let sql = format!(
        "DELETE FROM scene_metadata WHERE project_id = ?1 AND scene_id NOT IN ({})",
        placeholders
    );
    let mut values: Vec<rusqlite::types::Value> = Vec::with_capacity(scene_nodes.len() + 1);
    values.push(project_id.to_string().into());
    for (scene_id, _, _) in &scene_nodes {
        values.push(scene_id.clone().into());
    }

    conn.execute(&sql, rusqlite::params_from_iter(values))
        .map_err(|e| format!("Failed to delete stale scene metadata rows: {e}"))?;

    Ok(())
}

fn replace_structure(
    conn: &Connection,
    project_id: &str,
    structure: &[StructureNode],
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM structure_nodes WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| format!("Failed to clear existing structure rows: {e}"))?;

    let now = timestamp::now_millis();
    let mut flattened = Vec::new();
    flatten_structure_nodes(structure, None, &mut flattened);

    if !flattened.is_empty() {
        let mut stmt = conn
            .prepare(
                r#"
                INSERT INTO structure_nodes(
                    id, project_id, parent_id, node_type, title, order_index, scene_file, created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                "#,
            )
            .map_err(|e| format!("Failed to prepare structure insert: {e}"))?;

        for (id, parent_id, node_type, title, order_index, scene_file) in flattened {
            stmt.execute(params![
                id,
                project_id,
                parent_id,
                node_type,
                title,
                order_index,
                scene_file,
                now,
                now,
            ])
            .map_err(|e| format!("Failed to insert structure node: {e}"))?;
        }
    }

    sync_scene_metadata_from_structure(conn, project_id, structure)
}

fn normalize_series_index(series_index: &str) -> Result<String, String> {
    let normalized = series_index.trim().to_string();
    if normalized.is_empty() {
        return Err("Series index cannot be empty".to_string());
    }
    Ok(normalized)
}

#[tauri::command]
pub fn list_recent_projects() -> Result<Vec<RecentProject>, String> {
    let conn = open_app_db()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT project_path, title, last_opened
            FROM recent_projects
            ORDER BY last_opened DESC
            LIMIT 20
            "#,
        )
        .map_err(|e| format!("Failed to prepare recent project query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(RecentProject {
                path: row.get(0)?,
                title: row.get(1)?,
                last_opened: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to execute recent project query: {e}"))?;

    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(|e| format!("Failed to decode recent project row: {e}"))?);
    }
    Ok(projects)
}

#[tauri::command]
pub fn add_to_recent(project_path: String, title: String) -> Result<(), String> {
    let conn = open_app_db()?;
    add_recent_entry(&conn, &project_path, &title)
}

#[tauri::command]
pub fn remove_from_recent(project_path: String) -> Result<(), String> {
    let conn = open_app_db()?;
    conn.execute(
        "DELETE FROM recent_projects WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to remove recent project: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn open_project(project_path: String) -> Result<ProjectMeta, String> {
    let conn = open_app_db()?;
    let project = get_project_by_path(&conn, &project_path)?;
    add_recent_entry(&conn, &project.path, &project.title)?;
    Ok(project)
}

#[tauri::command]
pub fn get_projects_path() -> Result<String, String> {
    let projects_dir = get_projects_dir()?;
    Ok(projects_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectMeta>, String> {
    let conn = open_app_db()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, title, author, description, path, archived, language, cover_image,
                   series_id, series_index, created_at, updated_at
            FROM projects
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare list_projects query: {e}"))?;

    let rows = stmt
        .query_map([], row_to_project)
        .map_err(|e| format!("Failed to execute list_projects query: {e}"))?;

    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(|e| format!("Failed to decode project row: {e}"))?);
    }

    Ok(projects)
}

#[tauri::command]
pub fn create_project(
    title: String,
    author: String,
    custom_path: String,
    series_id: String,
    series_index: String,
) -> Result<ProjectMeta, String> {
    validate_project_creation(&title, Some(&author))?;
    let normalized_series_index = normalize_series_index(&series_index)?;

    let conn = open_app_db()?;
    ensure_series_exists(&conn, &series_id)?;
    ensure_unique_series_index(&conn, &series_id, &normalized_series_index, None)?;

    let base_dir = if custom_path.trim().is_empty() {
        get_projects_dir()?
    } else {
        PathBuf::from(&custom_path)
    };
    fs::create_dir_all(&base_dir)
        .map_err(|e| format!("Failed to create project base directory: {e}"))?;

    let slug = slugify(&title);
    let folder_name_base = if slug.trim().is_empty() {
        format!("project-{}", uuid::Uuid::new_v4())
    } else {
        slug
    };

    let mut project_dir = base_dir.join(&folder_name_base);
    let mut suffix = 2;
    while project_dir.exists() {
        project_dir = base_dir.join(format!("{}-{}", folder_name_base, suffix));
        suffix += 1;
    }

    fs::create_dir_all(project_dir.join(".meta")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("manuscript")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("snippets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("exports")).map_err(|e| e.to_string())?;

    let now = timestamp::now_millis();
    let project = ProjectMeta {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.clone(),
        author,
        description: String::new(),
        path: project_dir.to_string_lossy().to_string(),
        archived: false,
        language: None,
        cover_image: None,
        series_id,
        series_index: normalized_series_index,
        created_at: now,
        updated_at: now,
    };

    upsert_project(&conn, &project)?;
    add_recent_entry(&conn, &project.path, &project.title)?;

    Ok(project)
}

#[tauri::command]
pub fn delete_project(project_path: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let project = get_project_by_path(&conn, &project_path)?;

    let source = PathBuf::from(&project.path);
    let trash_dir = get_projects_trash_dir()?;
    fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;

    let folder_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("project");
    let trash_path = trash_dir.join(format!("{}_{}", folder_name, timestamp::now_millis()));

    if source.exists() {
        fs::rename(&source, &trash_path)
            .map_err(|e| format!("Failed to move project to trash: {e}"))?;
    }

    let payload_json = serde_json::to_string(&project)
        .map_err(|e| format!("Failed to serialize trashed project payload: {e}"))?;
    conn.execute(
        r#"
        INSERT OR REPLACE INTO deleted_projects(project_id, title, original_path, trash_path, payload_json, deleted_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        params![
            project.id,
            project.title,
            project.path,
            trash_path.to_string_lossy().to_string(),
            payload_json,
            timestamp::now_millis(),
        ],
    )
    .map_err(|e| format!("Failed to insert deleted project row: {e}"))?;

    conn.execute("DELETE FROM projects WHERE id = ?1", params![project.id])
        .map_err(|e| format!("Failed to remove project row: {e}"))?;
    conn.execute(
        "DELETE FROM recent_projects WHERE project_path = ?1",
        params![project.path],
    )
    .map_err(|e| format!("Failed to remove project from recent list: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn list_project_trash() -> Result<Vec<TrashedProject>, String> {
    let conn = open_app_db()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT project_id, title, original_path, trash_path, deleted_at
            FROM deleted_projects
            ORDER BY deleted_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare deleted project query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(TrashedProject {
                id: row.get(0)?,
                title: row.get(1)?,
                original_path: row.get(2)?,
                trash_path: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to execute deleted project query: {e}"))?;

    let mut trashed = Vec::new();
    for row in rows {
        trashed.push(row.map_err(|e| format!("Failed to decode deleted project row: {e}"))?);
    }

    Ok(trashed)
}

#[tauri::command]
pub fn restore_trashed_project(trash_path: String) -> Result<ProjectMeta, String> {
    let conn = open_app_db()?;
    let row = conn
        .query_row(
            r#"
            SELECT project_id, payload_json, original_path
            FROM deleted_projects
            WHERE trash_path = ?1
            "#,
            params![trash_path],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|e| format!("Failed to read deleted project row: {e}"))?
        .ok_or_else(|| "Trashed project not found".to_string())?;

    let (project_id, payload_json, original_path) = row;

    let mut project: ProjectMeta = serde_json::from_str(&payload_json)
        .map_err(|e| format!("Failed to parse trashed project payload: {e}"))?;

    let source = PathBuf::from(&trash_path);
    if !source.exists() {
        return Err("Trashed project directory not found".to_string());
    }

    let preferred_target = PathBuf::from(&original_path);
    let target = if preferred_target.exists() {
        let parent = preferred_target
            .parent()
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(&original_path));
        let stem = preferred_target
            .file_name()
            .and_then(|v| v.to_str())
            .unwrap_or("project");
        parent.join(format!("{}-restored-{}", stem, timestamp::now_millis()))
    } else {
        preferred_target
    };

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&source, &target).map_err(|e| format!("Failed to restore project: {e}"))?;

    project.id = project_id;
    project.path = target.to_string_lossy().to_string();
    project.series_id = resolve_series_for_restored_project(&conn, &project.series_id)?;
    project.updated_at = timestamp::now_millis();

    upsert_project(&conn, &project)?;
    conn.execute(
        "DELETE FROM deleted_projects WHERE trash_path = ?1",
        params![trash_path],
    )
    .map_err(|e| format!("Failed to remove deleted project row: {e}"))?;

    add_recent_entry(&conn, &project.path, &project.title)?;

    Ok(project)
}

#[tauri::command]
pub fn permanently_delete_trashed_project(trash_path: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let row = conn
        .query_row(
            r#"
            SELECT project_id, original_path
            FROM deleted_projects
            WHERE trash_path = ?1
            "#,
            params![trash_path],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|e| format!("Failed to load deleted project for permanent delete: {e}"))?;

    let Some((project_id, original_path)) = row else {
        return Ok(());
    };

    let path = PathBuf::from(&trash_path);
    if path.exists() {
        fs::remove_dir_all(&path)
            .map_err(|e| format!("Failed to remove trashed project directory: {e}"))?;
    }

    conn.execute(
        "DELETE FROM deleted_projects WHERE trash_path = ?1",
        params![trash_path],
    )
    .map_err(|e| format!("Failed to delete deleted_projects row: {e}"))?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![project_id])
        .map_err(|e| format!("Failed to delete project row: {e}"))?;
    conn.execute(
        "DELETE FROM recent_projects WHERE project_path = ?1",
        params![original_path],
    )
    .map_err(|e| format!("Failed to delete recent project row: {e}"))?;

    conn.execute(
        "DELETE FROM structure_nodes WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| format!("Failed to delete structure rows: {e}"))?;
    conn.execute(
        "DELETE FROM scene_metadata WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| format!("Failed to delete scene metadata rows: {e}"))?;
    conn.execute(
        "DELETE FROM snippets WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| format!("Failed to delete snippet rows: {e}"))?;
    conn.execute(
        "DELETE FROM scene_notes WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| format!("Failed to delete scene note rows: {e}"))?;
    conn.execute(
        "DELETE FROM chat_messages WHERE project_path = ?1",
        params![original_path],
    )
    .map_err(|e| format!("Failed to delete chat message rows: {e}"))?;
    conn.execute(
        "DELETE FROM chat_threads WHERE project_path = ?1",
        params![original_path],
    )
    .map_err(|e| format!("Failed to delete chat thread rows: {e}"))?;
    conn.execute(
        "DELETE FROM yjs_snapshots WHERE project_path = ?1",
        params![original_path],
    )
    .map_err(|e| format!("Failed to delete yjs snapshot rows: {e}"))?;
    conn.execute(
        "DELETE FROM yjs_update_log WHERE project_path = ?1",
        params![original_path],
    )
    .map_err(|e| format!("Failed to delete yjs update rows: {e}"))?;
    conn.execute(
        "DELETE FROM search_index WHERE project_path = ?1",
        params![original_path],
    )
    .map_err(|e| format!("Failed to delete search index rows: {e}"))?;
    conn.execute(
        "DELETE FROM search_sync_state WHERE project_path = ?1",
        params![original_path],
    )
    .map_err(|e| format!("Failed to delete search sync rows: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn update_project(
    project_path: String,
    updates: serde_json::Value,
) -> Result<ProjectMeta, String> {
    let conn = open_app_db()?;
    let mut project = get_project_by_path(&conn, &project_path)?;

    if let Some(title) = updates
        .get("title")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    {
        validate_project_title(&title)?;
        project.title = title;
    }
    if let Some(author) = updates
        .get("author")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    {
        project.author = author;
    }
    if let Some(description) = updates
        .get("description")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    {
        project.description = description;
    }

    if let Some(archived) = updates.get("archived").and_then(|v| v.as_bool()) {
        project.archived = archived;
    }

    if let Some(language) = updates
        .get("language")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    {
        project.language = if language.trim().is_empty() {
            None
        } else {
            Some(language)
        };
    }
    if updates.get("language").is_some_and(|v| v.is_null()) {
        project.language = None;
    }

    if let Some(cover) = updates
        .get("cover_image")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    {
        project.cover_image = if cover.trim().is_empty() {
            None
        } else {
            Some(cover)
        };
    }
    if updates.get("cover_image").is_some_and(|v| v.is_null()) {
        project.cover_image = None;
    }

    let next_series_id = updates
        .get("series_id")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let next_series_index = updates
        .get("series_index")
        .and_then(|v| v.as_str())
        .map(str::to_string);

    if let Some(series_id) = next_series_id {
        ensure_series_exists(&conn, &series_id)?;
        project.series_id = series_id;
    }

    if let Some(series_index) = next_series_index {
        project.series_index = normalize_series_index(&series_index)?;
    }

    ensure_unique_series_index(
        &conn,
        &project.series_id,
        &project.series_index,
        Some(&project.id),
    )?;

    project.updated_at = timestamp::now_millis();
    upsert_project(&conn, &project)?;

    Ok(project)
}

#[tauri::command]
pub fn archive_project(project_path: String) -> Result<ProjectMeta, String> {
    let updates = serde_json::json!({ "archived": true });
    update_project(project_path, updates)
}

#[tauri::command]
pub fn get_structure(project_path: String) -> Result<Vec<StructureNode>, String> {
    let conn = open_app_db()?;
    let project = get_project_by_path(&conn, &project_path)?;
    let rows = fetch_structure_rows(&conn, &project.id)?;
    Ok(build_structure_tree(rows))
}

#[tauri::command]
pub fn save_structure(project_path: String, structure: Vec<StructureNode>) -> Result<(), String> {
    let conn = open_app_db()?;
    let project = get_project_by_path(&conn, &project_path)?;
    replace_structure(&conn, &project.id, &structure)
}

fn validate_node_type(node_type: &str) -> Result<(), String> {
    match node_type {
        "act" | "chapter" | "scene" => Ok(()),
        _ => Err("Node type must be one of: act, chapter, scene".to_string()),
    }
}

fn insert_node_in_tree(
    nodes: &mut Vec<StructureNode>,
    parent_id: Option<&str>,
    node: StructureNode,
) -> Result<(), String> {
    if let Some(parent) = parent_id {
        for existing in nodes.iter_mut() {
            if existing.id == parent {
                existing.children.push(node);
                return Ok(());
            }
            if insert_node_in_tree(&mut existing.children, parent_id, node.clone()).is_ok() {
                return Ok(());
            }
        }
        return Err("Parent node not found".to_string());
    }

    nodes.push(node);
    Ok(())
}

#[tauri::command]
pub fn create_node(
    project_path: String,
    parent_id: Option<String>,
    node_type: String,
    title: String,
) -> Result<StructureNode, String> {
    validate_node_type(&node_type)?;
    let conn = open_app_db()?;
    let project = get_project_by_path(&conn, &project_path)?;

    let mut structure = get_structure(project_path.clone())?;
    let id = uuid::Uuid::new_v4().to_string();
    let new_node = StructureNode {
        id: id.clone(),
        node_type: node_type.clone(),
        title,
        order: 0,
        children: Vec::new(),
        file: if node_type == "scene" {
            Some(format!("{}.md", id))
        } else {
            None
        },
    };

    insert_node_in_tree(&mut structure, parent_id.as_deref(), new_node.clone())?;
    replace_structure(&conn, &project.id, &structure)?;

    if let Some(file) = &new_node.file {
        let file_path = PathBuf::from(&project.path).join("manuscript").join(file);
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if !file_path.exists() {
            fs::write(&file_path, "").map_err(|e| format!("Failed to create scene file: {e}"))?;
        }
    }

    Ok(new_node)
}

fn rename_node_in_tree(nodes: &mut [StructureNode], node_id: &str, new_title: &str) -> bool {
    for node in nodes.iter_mut() {
        if node.id == node_id {
            node.title = new_title.to_string();
            return true;
        }
        if rename_node_in_tree(&mut node.children, node_id, new_title) {
            return true;
        }
    }
    false
}

#[tauri::command]
pub fn rename_node(project_path: String, node_id: String, new_title: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let project = get_project_by_path(&conn, &project_path)?;
    let mut structure = get_structure(project_path)?;

    if !rename_node_in_tree(&mut structure, &node_id, &new_title) {
        return Err("Node not found".to_string());
    }

    replace_structure(&conn, &project.id, &structure)
}

fn remove_node_from_tree(
    nodes: &mut Vec<StructureNode>,
    node_id: &str,
    deleted_scene_files: &mut Vec<String>,
    deleted_scene_ids: &mut Vec<String>,
) -> bool {
    let mut index = 0;
    while index < nodes.len() {
        if nodes[index].id == node_id {
            let removed = nodes.remove(index);
            fn collect_deleted(
                node: &StructureNode,
                files: &mut Vec<String>,
                ids: &mut Vec<String>,
            ) {
                if node.node_type == "scene" {
                    ids.push(node.id.clone());
                    if let Some(file) = &node.file {
                        files.push(file.clone());
                    }
                }
                for child in &node.children {
                    collect_deleted(child, files, ids);
                }
            }
            collect_deleted(&removed, deleted_scene_files, deleted_scene_ids);
            return true;
        }

        if remove_node_from_tree(
            &mut nodes[index].children,
            node_id,
            deleted_scene_files,
            deleted_scene_ids,
        ) {
            return true;
        }
        index += 1;
    }

    false
}

#[tauri::command]
pub fn delete_node(project_path: String, node_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let project = get_project_by_path(&conn, &project_path)?;
    let mut structure = get_structure(project_path.clone())?;

    let mut deleted_scene_files = Vec::new();
    let mut deleted_scene_ids = Vec::new();

    if !remove_node_from_tree(
        &mut structure,
        &node_id,
        &mut deleted_scene_files,
        &mut deleted_scene_ids,
    ) {
        return Err("Node not found".to_string());
    }

    replace_structure(&conn, &project.id, &structure)?;

    for file in deleted_scene_files {
        let file_path = PathBuf::from(&project.path).join("manuscript").join(file);
        if file_path.exists() {
            fs::remove_file(&file_path).map_err(|e| {
                format!("Failed to delete scene file '{}': {e}", file_path.display())
            })?;
        }
    }

    for scene_id in deleted_scene_ids {
        conn.execute(
            "DELETE FROM scene_metadata WHERE scene_id = ?1",
            params![scene_id],
        )
        .map_err(|e| format!("Failed to delete scene metadata row: {e}"))?;
    }

    Ok(())
}
