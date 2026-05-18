// SQL-native backup/import commands (.baa package format)
//
// Package kinds:
// - full_snapshot: full app recovery (replace restore)
// - series_package: one series + all projects + full codex graph (clone import)
// - novel_package: one project + referenced codex subset (clone import)

use std::collections::{HashMap, HashSet};
use std::ffi::OsStr;
use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};

use chrono::Utc;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

use crate::models::{
    ChatMessage, ChatThread, CodexEntry, CodexEntryTag, CodexRelation, CodexRelationType, CodexTag,
    CodexTemplate, ProjectMeta, SceneCodexLink, SceneNote, Series, Snippet, StructureNode,
};
use crate::storage::open_app_db;
use crate::utils::{get_app_dir, slugify, validate_no_null_bytes};

const PACKAGE_EXTENSION: &str = "baa";
const MANIFEST_VERSION: i32 = 1;

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BackupPackageKind {
    FullSnapshot,
    SeriesPackage,
    NovelPackage,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupCounts {
    pub series: i64,
    pub projects: i64,
    pub scenes: i64,
    pub codex_entries: i64,
    pub codex_relations: i64,
    pub codex_tags: i64,
    pub codex_entry_tags: i64,
    pub codex_templates: i64,
    pub codex_relation_types: i64,
    pub scene_codex_links: i64,
    pub snippets: i64,
    pub scene_notes: i64,
    pub chat_threads: i64,
    pub chat_messages: i64,
    pub yjs_snapshots: i64,
    pub yjs_update_log: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupSourceHints {
    pub series_id: Option<String>,
    pub series_title: Option<String>,
    pub project_id: Option<String>,
    pub project_title: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BackupManifest {
    pub version: i32,
    pub kind: BackupPackageKind,
    pub created_at: String,
    pub app_version: String,
    pub schema_version: i64,
    pub secrets_included: bool,
    pub artifacts_included: bool,
    pub counts: BackupCounts,
    pub source_hints: BackupSourceHints,
    pub checksum: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BackupPackageSummary {
    pub kind: BackupPackageKind,
    pub path: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub created_at: String,
    pub sha256: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BackupPackageInfo {
    pub kind: BackupPackageKind,
    pub app_version: String,
    pub schema_version: i64,
    pub created_at: String,
    pub counts: BackupCounts,
    pub source_hints: BackupSourceHints,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupImportOptions {
    pub target_series_id: Option<String>,
    pub create_series_title: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BackupImportResult {
    pub kind: BackupPackageKind,
    pub imported_series_id: Option<String>,
    pub imported_project_ids: Vec<String>,
    pub replaced_app_data: bool,
    pub checkpoint_path: Option<String>,
    pub requires_relaunch: bool,
}

#[derive(Debug, Clone)]
struct ProjectSeed {
    id: String,
    title: String,
    author: String,
    description: String,
    path: String,
    archived: bool,
    language: Option<String>,
    cover_image: Option<String>,
    series_id: String,
    series_index: String,
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

#[derive(Debug, Clone)]
struct PreparedPackage {
    manifest: BackupManifest,
    payload_db_path: PathBuf,
    fs_root: Option<PathBuf>,
    _temp_dir: PathBuf,
}

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}

fn now_slug_timestamp() -> String {
    Utc::now().format("%Y%m%d_%H%M%S").to_string()
}

fn app_db_path() -> Result<PathBuf, String> {
    Ok(get_app_dir()?.join(".meta").join("app.db"))
}

fn get_local_schema_version() -> Result<i64, String> {
    let conn = open_app_db()?;
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| format!("Failed to read local schema version: {e}"))
}

fn ensure_archive_path_safe(path: &str) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Archive path cannot be empty".to_string());
    }
    if path.starts_with('/') || path.starts_with('\\') {
        return Err(format!("Archive path '{}' must be relative", path));
    }
    if path.contains('\\') {
        return Err(format!("Archive path '{}' must use forward slashes", path));
    }

    let p = Path::new(path);
    for component in p.components() {
        match component {
            Component::CurDir | Component::Normal(_) => {}
            _ => {
                return Err(format!(
                    "Archive path '{}' contains invalid component",
                    path
                ));
            }
        }
    }

    Ok(())
}

fn normalize_archive_rel(path: &Path) -> String {
    path.components()
        .filter_map(|component| match component {
            Component::Normal(seg) => Some(seg.to_string_lossy().to_string()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect::<String>()
}

fn compute_file_digest(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path)
        .map_err(|e| format!("Failed to open '{}' for hashing: {e}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read '{}' for hashing: {e}", path.display()))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(to_hex(&hasher.finalize()))
}

fn compute_package_checksum_from_files(
    db_path: &Path,
    fs_entries: &[(String, PathBuf)],
) -> Result<String, String> {
    let mut records = Vec::with_capacity(fs_entries.len() + 1);
    records.push(("db/payload.db".to_string(), compute_file_digest(db_path)?));

    for (archive_path, source_path) in fs_entries {
        ensure_archive_path_safe(archive_path)?;
        records.push((archive_path.clone(), compute_file_digest(source_path)?));
    }

    records.sort_by(|a, b| a.0.cmp(&b.0));

    let mut hasher = Sha256::new();
    for (path, digest) in records {
        hasher.update(path.as_bytes());
        hasher.update([0u8]);
        hasher.update(digest.as_bytes());
        hasher.update([0u8]);
    }

    Ok(to_hex(&hasher.finalize()))
}

fn compute_package_checksum_from_digests(
    db_digest: String,
    mut fs_digests: Vec<(String, String)>,
) -> Result<String, String> {
    let mut records = Vec::with_capacity(fs_digests.len() + 1);
    records.push(("db/payload.db".to_string(), db_digest));
    records.append(&mut fs_digests);

    for (path, _) in &records {
        ensure_archive_path_safe(path)?;
    }

    records.sort_by(|a, b| a.0.cmp(&b.0));

    let mut hasher = Sha256::new();
    for (path, digest) in records {
        hasher.update(path.as_bytes());
        hasher.update([0u8]);
        hasher.update(digest.as_bytes());
        hasher.update([0u8]);
    }

    Ok(to_hex(&hasher.finalize()))
}

fn package_kind_slug(kind: BackupPackageKind) -> &'static str {
    match kind {
        BackupPackageKind::FullSnapshot => "full_snapshot",
        BackupPackageKind::SeriesPackage => "series_package",
        BackupPackageKind::NovelPackage => "novel_package",
    }
}

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

fn load_project_by_id(project_id: &str) -> Result<ProjectMeta, String> {
    let conn = open_app_db()?;
    conn.query_row(
        r#"
        SELECT id, title, author, description, path, archived, language, cover_image,
               series_id, series_index, created_at, updated_at
        FROM projects
        WHERE id = ?1
        "#,
        params![project_id],
        project_from_row,
    )
    .optional()
    .map_err(|e| format!("Failed to load project metadata: {e}"))?
    .ok_or_else(|| "Project not found".to_string())
}

fn series_by_id(series_id: &str) -> Result<Series, String> {
    let all = crate::commands::series::list_series()?;
    all.into_iter()
        .find(|series| series.id == series_id)
        .ok_or_else(|| "Series not found".to_string())
}

fn create_temp_dir(label: &str) -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let root = app_dir.join(".meta").join("tmp");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let dir = root.join(format!("{}_{}", label, uuid::Uuid::new_v4()));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn escape_single_quotes(input: &str) -> String {
    input.replace('\'', "''")
}

fn snapshot_live_db(dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if dest.exists() {
        fs::remove_file(dest).map_err(|e| e.to_string())?;
    }

    let conn = open_app_db()?;
    let sql = format!(
        "VACUUM INTO '{}'",
        escape_single_quotes(&dest.to_string_lossy())
    );
    conn.execute_batch(&sql)
        .map_err(|e| format!("Failed to snapshot application database: {e}"))?;
    Ok(())
}

fn apply_common_db_prune(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM secure_secrets", [])
        .map_err(|e| format!("Failed to prune secure secrets: {e}"))?;
    conn.execute("DELETE FROM secure_accounts", [])
        .map_err(|e| format!("Failed to prune secure accounts: {e}"))?;

    conn.execute("DELETE FROM search_index", [])
        .map_err(|e| format!("Failed to prune search index: {e}"))?;
    conn.execute("DELETE FROM search_sync_state", [])
        .map_err(|e| format!("Failed to prune search sync state: {e}"))?;
    conn.execute("DELETE FROM model_discovery_cache", [])
        .map_err(|e| format!("Failed to prune model discovery cache: {e}"))?;

    Ok(())
}

fn prune_full_snapshot_db(db_path: &Path) -> Result<(), String> {
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open full snapshot payload DB: {e}"))?;
    apply_common_db_prune(&conn)
}

fn delete_not_in_column(
    conn: &Connection,
    table: &str,
    column: &str,
    values: &[String],
) -> Result<(), String> {
    if values.is_empty() {
        conn.execute(&format!("DELETE FROM {table}"), [])
            .map_err(|e| format!("Failed to clear table '{table}': {e}"))?;
        return Ok(());
    }

    let placeholders = vec!["?"; values.len()].join(",");
    let sql = format!("DELETE FROM {table} WHERE {column} NOT IN ({placeholders})");
    let params = values
        .iter()
        .map(|value| value as &dyn rusqlite::ToSql)
        .collect::<Vec<_>>();
    conn.execute(&sql, params.as_slice())
        .map_err(|e| format!("Failed to prune table '{table}': {e}"))?;
    Ok(())
}

fn delete_where_not_equal(
    conn: &Connection,
    table: &str,
    column: &str,
    value: &str,
) -> Result<(), String> {
    conn.execute(
        &format!("DELETE FROM {table} WHERE {column} != ?1"),
        params![value],
    )
    .map_err(|e| format!("Failed to prune table '{table}' by value: {e}"))?;
    Ok(())
}

fn series_project_ids_and_paths(
    conn: &Connection,
    series_id: &str,
) -> Result<Vec<ProjectSeed>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, title, author, description, path, archived, language, cover_image, series_id, series_index
            FROM projects
            WHERE series_id = ?1
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare series project query: {e}"))?;

    let rows = stmt
        .query_map(params![series_id], |row| {
            Ok(ProjectSeed {
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
            })
        })
        .map_err(|e| format!("Failed to execute series project query: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("Failed to decode series project row: {e}"))?);
    }

    Ok(result)
}

fn project_seed_by_id(conn: &Connection, project_id: &str) -> Result<ProjectSeed, String> {
    conn.query_row(
        r#"
        SELECT id, title, author, description, path, archived, language, cover_image, series_id, series_index
        FROM projects
        WHERE id = ?1
        "#,
        params![project_id],
        |row| {
            Ok(ProjectSeed {
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
            })
        },
    )
    .optional()
    .map_err(|e| format!("Failed to query project seed: {e}"))?
    .ok_or_else(|| "Project not found in payload database".to_string())
}

fn scene_ids_for_projects(
    conn: &Connection,
    project_ids: &[String],
) -> Result<Vec<String>, String> {
    if project_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = vec!["?"; project_ids.len()].join(",");
    let sql = format!(
        "SELECT scene_id FROM scene_metadata WHERE project_id IN ({})",
        placeholders
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare scene-id query: {e}"))?;

    let params = project_ids
        .iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect::<Vec<_>>();
    let rows = stmt
        .query_map(params.as_slice(), |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to execute scene-id query: {e}"))?;

    let mut scene_ids = Vec::new();
    for row in rows {
        scene_ids.push(row.map_err(|e| format!("Failed to decode scene-id row: {e}"))?);
    }
    Ok(scene_ids)
}

fn prune_series_package_db(db_path: &Path, series_id: &str) -> Result<(), String> {
    let conn =
        Connection::open(db_path).map_err(|e| format!("Failed to open series payload DB: {e}"))?;
    apply_common_db_prune(&conn)?;

    delete_where_not_equal(&conn, "series", "id", series_id)?;
    delete_where_not_equal(&conn, "projects", "series_id", series_id)?;

    let projects = series_project_ids_and_paths(&conn, series_id)?;
    let project_ids = projects.iter().map(|p| p.id.clone()).collect::<Vec<_>>();
    let project_paths = projects.iter().map(|p| p.path.clone()).collect::<Vec<_>>();

    delete_not_in_column(&conn, "structure_nodes", "project_id", &project_ids)?;
    delete_not_in_column(&conn, "scene_metadata", "project_id", &project_ids)?;
    delete_not_in_column(&conn, "snippets", "project_id", &project_ids)?;
    delete_not_in_column(&conn, "scene_notes", "project_id", &project_ids)?;
    delete_not_in_column(&conn, "chat_threads", "project_path", &project_paths)?;
    delete_not_in_column(&conn, "chat_messages", "project_path", &project_paths)?;
    delete_not_in_column(&conn, "yjs_snapshots", "project_path", &project_paths)?;
    delete_not_in_column(&conn, "yjs_update_log", "project_path", &project_paths)?;

    let scene_ids = scene_ids_for_projects(&conn, &project_ids)?;
    if scene_ids.is_empty() {
        conn.execute(
            "DELETE FROM scene_codex_links WHERE series_id = ?1",
            params![series_id],
        )
        .map_err(|e| format!("Failed pruning scene codex links: {e}"))?;
    } else {
        let placeholders = vec!["?"; scene_ids.len()].join(",");
        let sql = format!(
            "DELETE FROM scene_codex_links WHERE series_id = ?1 AND scene_id NOT IN ({})",
            placeholders
        );
        let mut values: Vec<rusqlite::types::Value> = Vec::with_capacity(scene_ids.len() + 1);
        values.push(series_id.to_string().into());
        for scene_id in scene_ids {
            values.push(scene_id.into());
        }
        conn.execute(&sql, params_from_iter(values))
            .map_err(|e| format!("Failed pruning scene codex links by scene set: {e}"))?;
    }
    conn.execute(
        "DELETE FROM scene_codex_links WHERE series_id != ?1",
        params![series_id],
    )
    .map_err(|e| format!("Failed pruning foreign scene codex links: {e}"))?;

    delete_where_not_equal(&conn, "codex_entries", "series_id", series_id)?;
    delete_where_not_equal(&conn, "codex_relations", "series_id", series_id)?;
    delete_where_not_equal(&conn, "codex_tags", "series_id", series_id)?;
    delete_where_not_equal(&conn, "codex_entry_tags", "series_id", series_id)?;
    delete_where_not_equal(&conn, "codex_templates", "series_id", series_id)?;
    delete_where_not_equal(&conn, "codex_relation_types", "series_id", series_id)?;

    conn.execute("DELETE FROM deleted_projects", [])
        .map_err(|e| format!("Failed clearing deleted projects: {e}"))?;
    conn.execute("DELETE FROM recent_projects", [])
        .map_err(|e| format!("Failed clearing recent projects: {e}"))?;
    conn.execute("DELETE FROM deleted_series_registry", [])
        .map_err(|e| format!("Failed clearing deleted series registry: {e}"))?;
    conn.execute("DELETE FROM app_preferences", [])
        .map_err(|e| format!("Failed clearing app preferences: {e}"))?;
    conn.execute("DELETE FROM ai_connection_models", [])
        .map_err(|e| format!("Failed clearing ai connection models: {e}"))?;
    conn.execute("DELETE FROM ai_connections", [])
        .map_err(|e| format!("Failed clearing ai connections: {e}"))?;

    Ok(())
}

fn prune_novel_package_db(db_path: &Path, project_id: &str) -> Result<(), String> {
    let conn =
        Connection::open(db_path).map_err(|e| format!("Failed to open novel payload DB: {e}"))?;
    apply_common_db_prune(&conn)?;

    let project = project_seed_by_id(&conn, project_id)?;

    conn.execute("DELETE FROM projects WHERE id != ?1", params![project_id])
        .map_err(|e| format!("Failed pruning projects for novel package: {e}"))?;

    delete_not_in_column(
        &conn,
        "structure_nodes",
        "project_id",
        &[project_id.to_string()],
    )?;
    delete_not_in_column(
        &conn,
        "scene_metadata",
        "project_id",
        &[project_id.to_string()],
    )?;
    delete_not_in_column(&conn, "snippets", "project_id", &[project_id.to_string()])?;
    delete_not_in_column(
        &conn,
        "scene_notes",
        "project_id",
        &[project_id.to_string()],
    )?;
    delete_not_in_column(
        &conn,
        "chat_threads",
        "project_path",
        std::slice::from_ref(&project.path),
    )?;
    delete_not_in_column(
        &conn,
        "chat_messages",
        "project_path",
        std::slice::from_ref(&project.path),
    )?;
    delete_not_in_column(
        &conn,
        "yjs_snapshots",
        "project_path",
        std::slice::from_ref(&project.path),
    )?;
    delete_not_in_column(
        &conn,
        "yjs_update_log",
        "project_path",
        std::slice::from_ref(&project.path),
    )?;

    conn.execute(
        "DELETE FROM series WHERE id != ?1",
        params![project.series_id],
    )
    .map_err(|e| format!("Failed pruning series rows for novel package: {e}"))?;

    let scene_ids = scene_ids_for_projects(&conn, &[project_id.to_string()])?;

    let mut retained_entry_ids = HashSet::new();

    if !scene_ids.is_empty() {
        let placeholders = vec!["?"; scene_ids.len()].join(",");
        let sql = format!(
            "SELECT codex_id FROM scene_codex_links WHERE series_id = ?1 AND scene_id IN ({})",
            placeholders
        );
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("Failed preparing linked codex query: {e}"))?;
        let mut values: Vec<rusqlite::types::Value> = Vec::with_capacity(scene_ids.len() + 1);
        values.push(project.series_id.clone().into());
        for scene_id in &scene_ids {
            values.push(scene_id.clone().into());
        }
        let rows = stmt
            .query_map(params_from_iter(values), |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying scene-linked codex: {e}"))?;
        for row in rows {
            retained_entry_ids
                .insert(row.map_err(|e| format!("Failed decoding linked codex row: {e}"))?);
        }
    }

    {
        let mut stmt = conn
            .prepare(
                "SELECT id, payload_json FROM codex_entries WHERE series_id = ?1 ORDER BY updated_at DESC",
            )
            .map_err(|e| format!("Failed preparing codex entry payload query: {e}"))?;
        let rows = stmt
            .query_map(params![project.series_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| format!("Failed querying codex entry payloads: {e}"))?;

        for row in rows {
            let (entry_id, payload) =
                row.map_err(|e| format!("Failed decoding codex entry payload row: {e}"))?;
            let value: serde_json::Value = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid codex payload in novel pruning: {e}"))?;
            if value
                .get("projectId")
                .and_then(|v| v.as_str())
                .is_some_and(|pid| pid == project_id)
            {
                retained_entry_ids.insert(entry_id);
            }
        }
    }

    if retained_entry_ids.is_empty() {
        conn.execute(
            "DELETE FROM codex_entries WHERE series_id = ?1",
            params![project.series_id],
        )
        .map_err(|e| format!("Failed clearing codex entries for novel package: {e}"))?;
        conn.execute(
            "DELETE FROM codex_relations WHERE series_id = ?1",
            params![project.series_id],
        )
        .map_err(|e| format!("Failed clearing codex relations for novel package: {e}"))?;
        conn.execute(
            "DELETE FROM codex_entry_tags WHERE series_id = ?1",
            params![project.series_id],
        )
        .map_err(|e| format!("Failed clearing codex entry tags for novel package: {e}"))?;
        conn.execute(
            "DELETE FROM codex_tags WHERE series_id = ?1",
            params![project.series_id],
        )
        .map_err(|e| format!("Failed clearing codex tags for novel package: {e}"))?;
        conn.execute(
            "DELETE FROM codex_templates WHERE series_id = ?1",
            params![project.series_id],
        )
        .map_err(|e| format!("Failed clearing codex templates for novel package: {e}"))?;
        conn.execute(
            "DELETE FROM codex_relation_types WHERE series_id = ?1",
            params![project.series_id],
        )
        .map_err(|e| format!("Failed clearing codex relation types for novel package: {e}"))?;
        conn.execute(
            "DELETE FROM scene_codex_links WHERE series_id = ?1",
            params![project.series_id],
        )
        .map_err(|e| format!("Failed clearing scene codex links for novel package: {e}"))?;
    } else {
        let retained = retained_entry_ids.into_iter().collect::<Vec<_>>();

        let placeholders = vec!["?"; retained.len()].join(",");
        let sql_entries = format!(
            "DELETE FROM codex_entries WHERE series_id = ?1 AND id NOT IN ({})",
            placeholders
        );
        let mut values: Vec<rusqlite::types::Value> = Vec::with_capacity(retained.len() + 1);
        values.push(project.series_id.clone().into());
        for id in &retained {
            values.push(id.clone().into());
        }
        conn.execute(&sql_entries, params_from_iter(values))
            .map_err(|e| format!("Failed pruning codex entries by retained set: {e}"))?;

        let placeholders = vec!["?"; retained.len()].join(",");
        let sql_relations = format!(
            "DELETE FROM codex_relations WHERE series_id = ?1 AND (parent_id NOT IN ({0}) OR child_id NOT IN ({0}))",
            placeholders
        );
        let mut relation_values: Vec<rusqlite::types::Value> =
            Vec::with_capacity(retained.len() * 2 + 1);
        relation_values.push(project.series_id.clone().into());
        for id in &retained {
            relation_values.push(id.clone().into());
        }
        for id in &retained {
            relation_values.push(id.clone().into());
        }
        conn.execute(&sql_relations, params_from_iter(relation_values))
            .map_err(|e| format!("Failed pruning codex relations by retained set: {e}"))?;

        let placeholders = vec!["?"; retained.len()].join(",");
        let sql_entry_tags = format!(
            "DELETE FROM codex_entry_tags WHERE series_id = ?1 AND entry_id NOT IN ({})",
            placeholders
        );
        let mut entry_tag_values: Vec<rusqlite::types::Value> =
            Vec::with_capacity(retained.len() + 1);
        entry_tag_values.push(project.series_id.clone().into());
        for id in &retained {
            entry_tag_values.push(id.clone().into());
        }
        conn.execute(&sql_entry_tags, params_from_iter(entry_tag_values))
            .map_err(|e| format!("Failed pruning codex entry tags by retained set: {e}"))?;

        let mut tag_stmt = conn
            .prepare("SELECT DISTINCT tag_id FROM codex_entry_tags WHERE series_id = ?1")
            .map_err(|e| format!("Failed preparing retained tag-id query: {e}"))?;
        let tag_rows = tag_stmt
            .query_map(params![project.series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying retained tag ids: {e}"))?;
        let mut retained_tag_ids = Vec::new();
        for row in tag_rows {
            retained_tag_ids
                .push(row.map_err(|e| format!("Failed decoding retained tag id: {e}"))?);
        }
        delete_not_in_column(&conn, "codex_tags", "id", &retained_tag_ids)?;
        delete_where_not_equal(&conn, "codex_tags", "series_id", &project.series_id)?;

        let mut template_ids = Vec::new();
        let mut template_stmt = conn
            .prepare("SELECT payload_json FROM codex_entries WHERE series_id = ?1")
            .map_err(|e| format!("Failed preparing retained template query: {e}"))?;
        let template_rows = template_stmt
            .query_map(params![project.series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying retained templates: {e}"))?;
        for row in template_rows {
            let payload = row.map_err(|e| format!("Failed decoding retained template row: {e}"))?;
            let value: serde_json::Value = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid codex entry payload while pruning templates: {e}"))?;
            if let Some(template_id) = value.get("templateId").and_then(|v| v.as_str()) {
                template_ids.push(template_id.to_string());
            }
        }
        delete_not_in_column(&conn, "codex_templates", "id", &template_ids)?;
        delete_where_not_equal(&conn, "codex_templates", "series_id", &project.series_id)?;

        let mut relation_type_ids = Vec::new();
        let mut rel_type_stmt = conn
            .prepare("SELECT payload_json FROM codex_relations WHERE series_id = ?1")
            .map_err(|e| format!("Failed preparing retained relation type query: {e}"))?;
        let rel_type_rows = rel_type_stmt
            .query_map(params![project.series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying retained relation type payloads: {e}"))?;
        for row in rel_type_rows {
            let payload =
                row.map_err(|e| format!("Failed decoding retained relation payload: {e}"))?;
            let value: serde_json::Value = serde_json::from_str(&payload).map_err(|e| {
                format!("Invalid codex relation payload while pruning relation types: {e}")
            })?;
            if let Some(type_id) = value.get("typeId").and_then(|v| v.as_str()) {
                relation_type_ids.push(type_id.to_string());
            }
        }
        delete_not_in_column(&conn, "codex_relation_types", "id", &relation_type_ids)?;
        delete_where_not_equal(
            &conn,
            "codex_relation_types",
            "series_id",
            &project.series_id,
        )?;

        if scene_ids.is_empty() {
            conn.execute(
                "DELETE FROM scene_codex_links WHERE series_id = ?1",
                params![project.series_id],
            )
            .map_err(|e| format!("Failed clearing scene codex links for novel package: {e}"))?;
        } else {
            let scene_placeholders = vec!["?"; scene_ids.len()].join(",");
            let entry_placeholders = vec!["?"; retained.len()].join(",");
            let sql = format!(
                "DELETE FROM scene_codex_links WHERE series_id = ?1 AND (scene_id NOT IN ({}) OR codex_id NOT IN ({}))",
                scene_placeholders, entry_placeholders
            );
            let mut values: Vec<rusqlite::types::Value> =
                Vec::with_capacity(1 + scene_ids.len() + retained.len());
            values.push(project.series_id.clone().into());
            for scene_id in &scene_ids {
                values.push(scene_id.clone().into());
            }
            for entry_id in &retained {
                values.push(entry_id.clone().into());
            }
            conn.execute(&sql, params_from_iter(values))
                .map_err(|e| format!("Failed pruning scene codex links by retained sets: {e}"))?;
        }
        delete_where_not_equal(&conn, "scene_codex_links", "series_id", &project.series_id)?;
    }

    conn.execute("DELETE FROM deleted_projects", [])
        .map_err(|e| format!("Failed clearing deleted projects: {e}"))?;
    conn.execute("DELETE FROM recent_projects", [])
        .map_err(|e| format!("Failed clearing recent projects: {e}"))?;
    conn.execute("DELETE FROM deleted_series_registry", [])
        .map_err(|e| format!("Failed clearing deleted series registry: {e}"))?;
    conn.execute("DELETE FROM app_preferences", [])
        .map_err(|e| format!("Failed clearing app preferences: {e}"))?;
    conn.execute("DELETE FROM ai_connection_models", [])
        .map_err(|e| format!("Failed clearing ai connection models: {e}"))?;
    conn.execute("DELETE FROM ai_connections", [])
        .map_err(|e| format!("Failed clearing ai connections: {e}"))?;

    Ok(())
}

fn count_rows(conn: &Connection, table: &str) -> Result<i64, String> {
    conn.query_row(&format!("SELECT COUNT(1) FROM {table}"), [], |row| {
        row.get(0)
    })
    .map_err(|e| format!("Failed to count rows for table '{table}': {e}"))
}

fn compute_counts(conn: &Connection) -> Result<BackupCounts, String> {
    Ok(BackupCounts {
        series: count_rows(conn, "series")?,
        projects: count_rows(conn, "projects")?,
        scenes: count_rows(conn, "scene_metadata")?,
        codex_entries: count_rows(conn, "codex_entries")?,
        codex_relations: count_rows(conn, "codex_relations")?,
        codex_tags: count_rows(conn, "codex_tags")?,
        codex_entry_tags: count_rows(conn, "codex_entry_tags")?,
        codex_templates: count_rows(conn, "codex_templates")?,
        codex_relation_types: count_rows(conn, "codex_relation_types")?,
        scene_codex_links: count_rows(conn, "scene_codex_links")?,
        snippets: count_rows(conn, "snippets")?,
        scene_notes: count_rows(conn, "scene_notes")?,
        chat_threads: count_rows(conn, "chat_threads")?,
        chat_messages: count_rows(conn, "chat_messages")?,
        yjs_snapshots: count_rows(conn, "yjs_snapshots")?,
        yjs_update_log: count_rows(conn, "yjs_update_log")?,
    })
}

fn collect_directory_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    if !root.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in WalkDir::new(root) {
        let entry = entry.map_err(|e| format!("Failed walking '{}': {e}", root.display()))?;
        if entry.file_type().is_file() {
            files.push(entry.path().to_path_buf());
        }
    }
    Ok(files)
}

fn collect_full_snapshot_fs_entries(app_dir: &Path) -> Result<Vec<(String, PathBuf)>, String> {
    let mut entries = Vec::new();

    let projects_root = app_dir.join("Projects");
    for file in collect_directory_files(&projects_root)? {
        let rel = file
            .strip_prefix(&projects_root)
            .map_err(|e| format!("Failed deriving project relative path: {e}"))?;

        if rel.components().any(|component| {
            component
                .as_os_str()
                .to_string_lossy()
                .eq_ignore_ascii_case("exports")
        }) {
            continue;
        }

        let archive_path = format!("fs/Projects/{}", normalize_archive_rel(rel));
        entries.push((archive_path, file));
    }

    let trash_root = app_dir.join("Trash");
    for file in collect_directory_files(&trash_root)? {
        let rel = file
            .strip_prefix(&trash_root)
            .map_err(|e| format!("Failed deriving trash relative path: {e}"))?;
        let archive_path = format!("fs/Trash/{}", normalize_archive_rel(rel));
        entries.push((archive_path, file));
    }

    entries.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(entries)
}

fn collect_project_manuscript_entries(
    projects: &[ProjectSeed],
) -> Result<Vec<(String, PathBuf)>, String> {
    let mut entries = Vec::new();

    for project in projects {
        let manuscript_root = PathBuf::from(&project.path).join("manuscript");
        if !manuscript_root.exists() {
            continue;
        }

        for file in collect_directory_files(&manuscript_root)? {
            let rel = file
                .strip_prefix(&manuscript_root)
                .map_err(|e| format!("Failed deriving manuscript relative path: {e}"))?;
            let archive_path = format!(
                "fs/projects/{}/manuscript/{}",
                project.id,
                normalize_archive_rel(rel)
            );
            entries.push((archive_path, file));
        }
    }

    entries.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(entries)
}

fn default_output_path(kind: BackupPackageKind, hint: Option<&str>) -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let ts = now_slug_timestamp();
    let file_stem = match kind {
        BackupPackageKind::FullSnapshot => format!("baa_full_snapshot_{ts}"),
        BackupPackageKind::SeriesPackage => {
            let label = hint.unwrap_or("series");
            format!("{}_{}_{}", package_kind_slug(kind), slugify(label), ts)
        }
        BackupPackageKind::NovelPackage => {
            let label = hint.unwrap_or("novel");
            format!("{}_{}_{}", package_kind_slug(kind), slugify(label), ts)
        }
    };

    Ok(backups_dir.join(format!("{}.{}", file_stem, PACKAGE_EXTENSION)))
}

fn write_package_zip(
    output_path: &Path,
    manifest: &BackupManifest,
    payload_db_path: &Path,
    fs_entries: &[(String, PathBuf)],
) -> Result<u64, String> {
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let file = fs::File::create(output_path)
        .map_err(|e| format!("Failed creating package '{}': {e}", output_path.display()))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    let manifest_json = serde_json::to_vec_pretty(manifest)
        .map_err(|e| format!("Failed to serialize package manifest: {e}"))?;
    zip.start_file("manifest.json", options)
        .map_err(|e| format!("Failed adding manifest to package: {e}"))?;
    zip.write_all(&manifest_json)
        .map_err(|e| format!("Failed writing manifest to package: {e}"))?;

    zip.start_file("db/payload.db", options)
        .map_err(|e| format!("Failed adding DB payload to package: {e}"))?;
    {
        let mut file = fs::File::open(payload_db_path)
            .map_err(|e| format!("Failed opening payload DB for package write: {e}"))?;
        let mut buffer = [0u8; 8192];
        loop {
            let read = file
                .read(&mut buffer)
                .map_err(|e| format!("Failed reading payload DB during package write: {e}"))?;
            if read == 0 {
                break;
            }
            zip.write_all(&buffer[..read])
                .map_err(|e| format!("Failed writing payload DB to package: {e}"))?;
        }
    }

    let mut sorted_entries = fs_entries.to_vec();
    sorted_entries.sort_by(|a, b| a.0.cmp(&b.0));

    for (archive_path, source_path) in sorted_entries {
        ensure_archive_path_safe(&archive_path)?;
        zip.start_file(&archive_path, options)
            .map_err(|e| format!("Failed adding '{}' to package: {e}", archive_path))?;

        let mut file = fs::File::open(&source_path).map_err(|e| {
            format!(
                "Failed opening source file '{}' for package write: {e}",
                source_path.display()
            )
        })?;
        let mut buffer = [0u8; 8192];
        loop {
            let read = file
                .read(&mut buffer)
                .map_err(|e| format!("Failed reading source file for package write: {e}"))?;
            if read == 0 {
                break;
            }
            zip.write_all(&buffer[..read])
                .map_err(|e| format!("Failed writing '{}' to package: {e}", archive_path))?;
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed finalizing package archive: {e}"))?;

    let metadata = fs::metadata(output_path)
        .map_err(|e| format!("Failed stat-ing package '{}': {e}", output_path.display()))?;
    Ok(metadata.len())
}

fn build_package(
    kind: BackupPackageKind,
    output_path: Option<String>,
    series_id: Option<String>,
    project_id: Option<String>,
) -> Result<BackupPackageSummary, String> {
    let temp_dir = create_temp_dir("backup-package")?;
    let payload_db_path = temp_dir.join("payload.db");
    snapshot_live_db(&payload_db_path)?;

    let (source_hint, fs_entries) = match kind {
        BackupPackageKind::FullSnapshot => {
            prune_full_snapshot_db(&payload_db_path)?;
            let app_dir = get_app_dir()?;
            let fs_entries = collect_full_snapshot_fs_entries(&app_dir)?;
            (BackupSourceHints::default(), fs_entries)
        }
        BackupPackageKind::SeriesPackage => {
            let sid = series_id.ok_or("Series package export requires series_id")?;
            let series = series_by_id(&sid)?;
            prune_series_package_db(&payload_db_path, &sid)?;

            let conn = Connection::open(&payload_db_path)
                .map_err(|e| format!("Failed opening pruned series payload DB: {e}"))?;
            let projects = series_project_ids_and_paths(&conn, &sid)?;
            let fs_entries = collect_project_manuscript_entries(&projects)?;

            (
                BackupSourceHints {
                    series_id: Some(sid),
                    series_title: Some(series.title),
                    project_id: None,
                    project_title: None,
                },
                fs_entries,
            )
        }
        BackupPackageKind::NovelPackage => {
            let pid = project_id.ok_or("Novel package export requires project_id")?;
            let project = load_project_by_id(&pid)?;
            prune_novel_package_db(&payload_db_path, &pid)?;

            let seed = ProjectSeed {
                id: project.id.clone(),
                title: project.title.clone(),
                author: project.author,
                description: project.description,
                path: project.path,
                archived: project.archived,
                language: project.language,
                cover_image: project.cover_image,
                series_id: project.series_id,
                series_index: project.series_index,
            };
            let fs_entries = collect_project_manuscript_entries(&[seed])?;

            (
                BackupSourceHints {
                    series_id: None,
                    series_title: None,
                    project_id: Some(project.id),
                    project_title: Some(project.title),
                },
                fs_entries,
            )
        }
    };

    let payload_conn = Connection::open(&payload_db_path)
        .map_err(|e| format!("Failed opening payload DB for manifest counts: {e}"))?;
    let schema_version: i64 = payload_conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| format!("Failed reading payload schema version: {e}"))?;
    let counts = compute_counts(&payload_conn)?;

    let checksum = compute_package_checksum_from_files(&payload_db_path, &fs_entries)?;
    let created_at = now_rfc3339();

    let manifest = BackupManifest {
        version: MANIFEST_VERSION,
        kind,
        created_at: created_at.clone(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version,
        secrets_included: false,
        artifacts_included: false,
        counts,
        source_hints: source_hint,
        checksum: checksum.clone(),
    };

    let output_path = match output_path {
        Some(path) => PathBuf::from(path),
        None => {
            let hint = manifest
                .source_hints
                .series_title
                .as_deref()
                .or(manifest.source_hints.project_title.as_deref());
            default_output_path(kind, hint)?
        }
    };

    let size_bytes = write_package_zip(&output_path, &manifest, &payload_db_path, &fs_entries)?;

    let summary = BackupPackageSummary {
        kind,
        path: output_path.to_string_lossy().to_string(),
        file_name: output_path
            .file_name()
            .and_then(OsStr::to_str)
            .unwrap_or("backup.baa")
            .to_string(),
        size_bytes,
        created_at,
        sha256: checksum,
    };

    let _ = fs::remove_dir_all(&temp_dir);

    Ok(summary)
}

fn is_supported_package_path(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(OsStr::to_str)
        .is_some_and(|ext| ext.eq_ignore_ascii_case(PACKAGE_EXTENSION))
}

fn write_zip_entry_with_digest<R: Read>(
    mut reader: R,
    output_path: &Path,
) -> Result<String, String> {
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut file = fs::File::create(output_path).map_err(|e| {
        format!(
            "Failed creating extracted file '{}': {e}",
            output_path.display()
        )
    })?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let read = reader
            .read(&mut buffer)
            .map_err(|e| format!("Failed reading zip entry: {e}"))?;
        if read == 0 {
            break;
        }

        file.write_all(&buffer[..read]).map_err(|e| {
            format!(
                "Failed writing extracted file '{}': {e}",
                output_path.display()
            )
        })?;
        hasher.update(&buffer[..read]);
    }

    Ok(to_hex(&hasher.finalize()))
}

fn digest_zip_entry<R: Read>(mut reader: R) -> Result<String, String> {
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let read = reader
            .read(&mut buffer)
            .map_err(|e| format!("Failed reading zip entry: {e}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    Ok(to_hex(&hasher.finalize()))
}

fn read_manifest_file(path: &Path) -> Result<BackupManifest, String> {
    let manifest_json = fs::read_to_string(path)
        .map_err(|e| format!("Failed reading manifest '{}': {e}", path.display()))?;
    serde_json::from_str::<BackupManifest>(&manifest_json)
        .map_err(|e| format!("Failed parsing backup manifest: {e}"))
}

fn prepare_package(path: &str, extract_fs: bool) -> Result<PreparedPackage, String> {
    if !is_supported_package_path(path) {
        return Err("Unsupported backup package extension. Expected .baa".to_string());
    }

    let package_path = PathBuf::from(path);
    if !package_path.exists() {
        return Err("Backup package not found".to_string());
    }

    let file = fs::File::open(&package_path)
        .map_err(|e| format!("Failed opening package '{}': {e}", package_path.display()))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed reading package archive: {e}"))?;

    let temp_dir = create_temp_dir("backup-import")?;
    let manifest_path = temp_dir.join("manifest.json");
    let payload_db_path = temp_dir.join("payload.db");
    let fs_root = temp_dir.join("fs");

    let mut db_digest: Option<String> = None;
    let mut fs_digests: Vec<(String, String)> = Vec::new();
    let mut saw_manifest = false;
    let mut saw_db = false;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed reading zip entry: {e}"))?;

        let entry_name = entry.name().to_string();
        if entry_name.ends_with('/') {
            continue;
        }

        ensure_archive_path_safe(&entry_name)?;

        match entry_name.as_str() {
            "manifest.json" => {
                let digest = write_zip_entry_with_digest(&mut entry, &manifest_path)?;
                saw_manifest = true;
                let _ = digest;
            }
            "db/payload.db" => {
                let digest = write_zip_entry_with_digest(&mut entry, &payload_db_path)?;
                db_digest = Some(digest);
                saw_db = true;
            }
            _ if entry_name.starts_with("fs/") => {
                let relative = Path::new(&entry_name)
                    .strip_prefix("fs")
                    .map_err(|e| format!("Invalid fs entry path '{}': {e}", entry_name))?;
                let target = fs_root.join(relative);
                if extract_fs {
                    let digest = write_zip_entry_with_digest(&mut entry, &target)?;
                    fs_digests.push((entry_name, digest));
                } else {
                    let digest = digest_zip_entry(&mut entry)?;
                    fs_digests.push((entry_name, digest));
                }
            }
            _ => {
                return Err(format!(
                    "Unsupported package entry '{}'. Only manifest/db/fs entries are allowed",
                    entry_name
                ));
            }
        }
    }

    if !saw_manifest {
        return Err("Invalid package: missing manifest.json".to_string());
    }
    if !saw_db {
        return Err("Invalid package: missing db/payload.db".to_string());
    }

    let manifest = read_manifest_file(&manifest_path)?;
    if manifest.version != MANIFEST_VERSION {
        return Err(format!(
            "Unsupported package manifest version {}",
            manifest.version
        ));
    }

    let expected_checksum = compute_package_checksum_from_digests(
        db_digest.ok_or("Failed computing db digest from package")?,
        fs_digests,
    )?;
    if manifest.checksum != expected_checksum {
        return Err("Package checksum mismatch".to_string());
    }

    let payload_conn = Connection::open(&payload_db_path)
        .map_err(|e| format!("Failed opening payload DB from package: {e}"))?;
    let payload_schema_version: i64 = payload_conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| format!("Failed reading payload schema version: {e}"))?;

    if payload_schema_version != manifest.schema_version {
        return Err(format!(
            "Package schema mismatch: manifest={} payload={}.",
            manifest.schema_version, payload_schema_version
        ));
    }

    let local_schema_version = get_local_schema_version()?;
    if payload_schema_version != local_schema_version {
        return Err(format!(
            "Incompatible package schema {} (local app schema is {}).",
            payload_schema_version, local_schema_version
        ));
    }

    Ok(PreparedPackage {
        manifest,
        payload_db_path,
        fs_root: if extract_fs { Some(fs_root) } else { None },
        _temp_dir: temp_dir,
    })
}

fn create_project_with_unique_series_index(
    title: String,
    author: String,
    series_id: String,
    requested_series_index: String,
) -> Result<ProjectMeta, String> {
    let series_index = requested_series_index.trim().to_string();
    if series_index.is_empty() {
        return Err("Imported project is missing a series index".to_string());
    }

    crate::commands::project::create_project(title, author, String::new(), series_id, series_index)
}

fn clone_project_from_seed(
    seed: &ProjectSeed,
    target_series_id: &str,
) -> Result<ProjectMeta, String> {
    let mut project = create_project_with_unique_series_index(
        seed.title.clone(),
        seed.author.clone(),
        target_series_id.to_string(),
        seed.series_index.clone(),
    )?;

    let updates = serde_json::json!({
        "description": seed.description,
        "archived": seed.archived,
        "language": seed.language,
        "cover_image": seed.cover_image
    });
    project = crate::commands::project::update_project(project.path.clone(), updates)?;

    Ok(project)
}

fn read_structure_rows(
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
        .map_err(|e| format!("Failed preparing structure row query: {e}"))?;

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
        .map_err(|e| format!("Failed querying structure rows: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("Failed decoding structure row: {e}"))?);
    }
    Ok(result)
}

fn build_structure_tree_with_remapped_ids(
    rows: Vec<StructureNodeRow>,
) -> (Vec<StructureNode>, HashMap<String, String>) {
    let mut grouped: HashMap<Option<String>, Vec<StructureNodeRow>> = HashMap::new();
    for row in rows {
        grouped.entry(row.parent_id.clone()).or_default().push(row);
    }

    for list in grouped.values_mut() {
        list.sort_by(|a, b| a.order_index.cmp(&b.order_index));
    }

    let mut id_map: HashMap<String, String> = HashMap::new();

    fn build_nodes(
        grouped: &mut HashMap<Option<String>, Vec<StructureNodeRow>>,
        parent_id: Option<String>,
        id_map: &mut HashMap<String, String>,
    ) -> Vec<StructureNode> {
        let rows = grouped.remove(&parent_id).unwrap_or_default();

        rows.into_iter()
            .map(|row| {
                let new_id = uuid::Uuid::new_v4().to_string();
                id_map.insert(row.id.clone(), new_id.clone());
                let children = build_nodes(grouped, Some(row.id), id_map);
                StructureNode {
                    id: new_id,
                    node_type: row.node_type,
                    title: row.title,
                    order: row.order_index,
                    children,
                    file: row.scene_file,
                }
            })
            .collect()
    }

    let tree = build_nodes(&mut grouped, None, &mut id_map);
    (tree, id_map)
}

#[allow(clippy::too_many_arguments)]
fn upsert_scene_metadata_row(
    conn: &Connection,
    project_id: &str,
    scene_id: &str,
    scene_file: &str,
    title: &str,
    order_index: i32,
    status: &str,
    word_count: i32,
    pov_character: Option<String>,
    subtitle: Option<String>,
    labels_json: &str,
    exclude_from_ai: bool,
    summary: &str,
    archived: bool,
    created_at: i64,
    updated_at: i64,
) -> Result<(), String> {
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
            scene_id,
            project_id,
            scene_file,
            title,
            order_index,
            status,
            word_count,
            pov_character,
            subtitle,
            labels_json,
            bool_to_sql(exclude_from_ai),
            summary,
            bool_to_sql(archived),
            created_at,
            updated_at,
        ],
    )
    .map_err(|e| format!("Failed to upsert cloned scene metadata row: {e}"))?;

    Ok(())
}

fn copy_directory_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    if !src.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(src) {
        let entry = entry.map_err(|e| format!("Failed walking '{}': {e}", src.display()))?;
        let relative = entry
            .path()
            .strip_prefix(src)
            .map_err(|e| format!("Failed deriving relative path while copying directory: {e}"))?;
        let target_path = dest.join(relative);

        if entry.file_type().is_dir() {
            fs::create_dir_all(&target_path).map_err(|e| e.to_string())?;
        } else if entry.file_type().is_file() {
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::copy(entry.path(), &target_path).map_err(|e| {
                format!(
                    "Failed copying '{}' to '{}': {e}",
                    entry.path().display(),
                    target_path.display()
                )
            })?;
        }
    }

    Ok(())
}

fn restore_project_artifacts(
    fs_root: &Path,
    old_project_id: &str,
    new_project_path: &str,
) -> Result<(), String> {
    let source = fs_root
        .join("projects")
        .join(old_project_id)
        .join("manuscript");
    let target = PathBuf::from(new_project_path).join("manuscript");
    copy_directory_recursive(&source, &target)
}

fn import_project_payload(
    payload_conn: &Connection,
    app_conn: &Connection,
    fs_root: &Path,
    seed: &ProjectSeed,
    target_series_id: &str,
) -> Result<(ProjectMeta, HashMap<String, String>), String> {
    let cloned_project = clone_project_from_seed(seed, target_series_id)?;

    let structure_rows = read_structure_rows(payload_conn, &seed.id)?;
    let (structure, mut scene_id_map) = build_structure_tree_with_remapped_ids(structure_rows);
    if !structure.is_empty() {
        crate::commands::project::save_structure(cloned_project.path.clone(), structure)?;
    }

    restore_project_artifacts(fs_root, &seed.id, &cloned_project.path)?;

    {
        let mut stmt = payload_conn
            .prepare(
                r#"
                SELECT scene_id, scene_file, title, order_index, status, word_count,
                       pov_character, subtitle, labels_json, exclude_from_ai,
                       summary, archived, created_at, updated_at
                FROM scene_metadata
                WHERE project_id = ?1
                ORDER BY order_index ASC
                "#,
            )
            .map_err(|e| format!("Failed preparing scene metadata import query: {e}"))?;

        let rows = stmt
            .query_map(params![seed.id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i32>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i32>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, String>(8)?,
                    row.get::<_, i64>(9)? != 0,
                    row.get::<_, String>(10)?,
                    row.get::<_, i64>(11)? != 0,
                    row.get::<_, i64>(12)?,
                    row.get::<_, i64>(13)?,
                ))
            })
            .map_err(|e| format!("Failed querying scene metadata for import: {e}"))?;

        for row in rows {
            let (
                old_scene_id,
                scene_file,
                title,
                order_index,
                status,
                word_count,
                pov_character,
                subtitle,
                labels_json,
                exclude_from_ai,
                summary,
                archived,
                created_at,
                updated_at,
            ) = row.map_err(|e| format!("Failed decoding scene metadata import row: {e}"))?;

            validate_no_null_bytes(&scene_file, "Scene file")?;
            let remapped_scene_id = scene_id_map
                .entry(old_scene_id)
                .or_insert_with(|| uuid::Uuid::new_v4().to_string())
                .clone();

            upsert_scene_metadata_row(
                app_conn,
                &cloned_project.id,
                &remapped_scene_id,
                &scene_file,
                &title,
                order_index,
                &status,
                word_count,
                pov_character,
                subtitle,
                &labels_json,
                exclude_from_ai,
                &summary,
                archived,
                created_at,
                updated_at,
            )?;
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                r#"
                SELECT id, title, content_json, pinned, created_at, updated_at
                FROM snippets
                WHERE project_id = ?1
                ORDER BY updated_at DESC
                "#,
            )
            .map_err(|e| format!("Failed preparing snippets import query: {e}"))?;
        let rows = stmt
            .query_map(params![seed.id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)? != 0,
                    row.get::<_, i64>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            })
            .map_err(|e| format!("Failed querying snippets for import: {e}"))?;

        for row in rows {
            let (_, title, content_json, pinned, created_at, updated_at) =
                row.map_err(|e| format!("Failed decoding snippet import row: {e}"))?;
            let content = serde_json::from_str::<serde_json::Value>(&content_json)
                .map_err(|e| format!("Invalid snippet payload during import: {e}"))?;
            let snippet = Snippet {
                id: uuid::Uuid::new_v4().to_string(),
                project_id: cloned_project.id.clone(),
                title,
                content,
                pinned,
                created_at,
                updated_at,
            };
            crate::commands::snippet::save_snippet(cloned_project.path.clone(), snippet)?;
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                r#"
                SELECT id, scene_id, content_json, created_at, updated_at
                FROM scene_notes
                WHERE project_id = ?1
                ORDER BY updated_at DESC
                "#,
            )
            .map_err(|e| format!("Failed preparing scene-note import query: {e}"))?;
        let rows = stmt
            .query_map(params![seed.id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, i64>(4)?,
                ))
            })
            .map_err(|e| format!("Failed querying scene notes for import: {e}"))?;

        for row in rows {
            let (_, old_scene_id, content_json, created_at, updated_at) =
                row.map_err(|e| format!("Failed decoding scene note import row: {e}"))?;
            let content = serde_json::from_str::<serde_json::Value>(&content_json)
                .map_err(|e| format!("Invalid scene note payload during import: {e}"))?;
            let remapped_scene_id = scene_id_map
                .entry(old_scene_id)
                .or_insert_with(|| uuid::Uuid::new_v4().to_string())
                .clone();
            let note = SceneNote {
                id: uuid::Uuid::new_v4().to_string(),
                scene_id: remapped_scene_id,
                project_id: cloned_project.id.clone(),
                content,
                created_at,
                updated_at,
            };
            crate::commands::scene_note::save_scene_note(cloned_project.path.clone(), note)?;
        }
    }

    {
        let mut thread_id_map: HashMap<String, String> = HashMap::new();

        let mut thread_stmt = payload_conn
            .prepare(
                r#"
                SELECT id, name, pinned, archived, deleted_at, default_model, created_at, updated_at
                FROM chat_threads
                WHERE project_path = ?1
                ORDER BY updated_at DESC
                "#,
            )
            .map_err(|e| format!("Failed preparing chat-thread import query: {e}"))?;
        let thread_rows = thread_stmt
            .query_map(params![seed.path.clone()], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)? != 0,
                    row.get::<_, i64>(3)? != 0,
                    row.get::<_, Option<i64>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, i64>(6)?,
                    row.get::<_, i64>(7)?,
                ))
            })
            .map_err(|e| format!("Failed querying chat threads for import: {e}"))?;

        for row in thread_rows {
            let (
                old_thread_id,
                name,
                pinned,
                archived,
                deleted_at,
                default_model,
                created_at,
                updated_at,
            ) = row.map_err(|e| format!("Failed decoding chat-thread import row: {e}"))?;

            let thread = ChatThread {
                id: uuid::Uuid::new_v4().to_string(),
                project_id: cloned_project.id.clone(),
                name,
                pinned,
                archived,
                deleted_at,
                default_model,
                created_at,
                updated_at,
            };
            let created =
                crate::commands::chat::create_chat_thread(cloned_project.path.clone(), thread)?;
            thread_id_map.insert(old_thread_id, created.id);
        }

        let mut message_stmt = payload_conn
            .prepare(
                r#"
                SELECT id, thread_id, role, content, model, timestamp
                FROM chat_messages
                WHERE project_path = ?1
                ORDER BY timestamp ASC
                "#,
            )
            .map_err(|e| format!("Failed preparing chat-message import query: {e}"))?;
        let message_rows = message_stmt
            .query_map(params![seed.path.clone()], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            })
            .map_err(|e| format!("Failed querying chat messages for import: {e}"))?;

        for row in message_rows {
            let (_old_message_id, old_thread_id, role, content, model, timestamp) =
                row.map_err(|e| format!("Failed decoding chat-message import row: {e}"))?;
            let Some(new_thread_id) = thread_id_map.get(&old_thread_id).cloned() else {
                continue;
            };
            let message = ChatMessage {
                id: uuid::Uuid::new_v4().to_string(),
                thread_id: new_thread_id,
                role,
                content,
                model,
                timestamp,
            };
            crate::commands::chat::create_chat_message(cloned_project.path.clone(), message)?;
        }
    }

    {
        let mut snap_stmt = payload_conn
            .prepare(
                r#"
                SELECT scene_id, update_blob, saved_at
                FROM yjs_snapshots
                WHERE project_path = ?1
                "#,
            )
            .map_err(|e| format!("Failed preparing yjs snapshot import query: {e}"))?;
        let snap_rows = snap_stmt
            .query_map(params![seed.path.clone()], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Vec<u8>>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })
            .map_err(|e| format!("Failed querying yjs snapshots for import: {e}"))?;

        for row in snap_rows {
            let (old_scene_id, update_blob, saved_at) =
                row.map_err(|e| format!("Failed decoding yjs snapshot import row: {e}"))?;
            let remapped_scene_id = scene_id_map
                .entry(old_scene_id)
                .or_insert_with(|| uuid::Uuid::new_v4().to_string())
                .clone();
            app_conn
                .execute(
                    r#"
                    INSERT OR REPLACE INTO yjs_snapshots(project_path, scene_id, update_blob, saved_at)
                    VALUES (?1, ?2, ?3, ?4)
                    "#,
                    params![
                        cloned_project.path,
                        remapped_scene_id,
                        update_blob,
                        saved_at
                    ],
                )
                .map_err(|e| format!("Failed importing yjs snapshot row: {e}"))?;
        }

        let mut log_stmt = payload_conn
            .prepare(
                r#"
                SELECT scene_id, update_blob, saved_at
                FROM yjs_update_log
                WHERE project_path = ?1
                ORDER BY seq ASC
                "#,
            )
            .map_err(|e| format!("Failed preparing yjs update-log import query: {e}"))?;
        let log_rows = log_stmt
            .query_map(params![seed.path.clone()], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Vec<u8>>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })
            .map_err(|e| format!("Failed querying yjs update logs for import: {e}"))?;

        for row in log_rows {
            let (old_scene_id, update_blob, saved_at) =
                row.map_err(|e| format!("Failed decoding yjs update-log import row: {e}"))?;
            let remapped_scene_id = scene_id_map
                .entry(old_scene_id)
                .or_insert_with(|| uuid::Uuid::new_v4().to_string())
                .clone();
            app_conn
                .execute(
                    r#"
                    INSERT INTO yjs_update_log(project_path, scene_id, update_blob, saved_at)
                    VALUES (?1, ?2, ?3, ?4)
                    "#,
                    params![
                        cloned_project.path,
                        remapped_scene_id,
                        update_blob,
                        saved_at
                    ],
                )
                .map_err(|e| format!("Failed importing yjs update-log row: {e}"))?;
        }
    }

    Ok((cloned_project, scene_id_map))
}

fn upsert_codex_tag(conn: &Connection, series_id: &str, tag: &CodexTag) -> Result<(), String> {
    let payload_json = serde_json::to_string(tag).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO codex_tags(id, series_id, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            tag.id,
            series_id,
            payload_json,
            tag.created_at,
            tag.updated_at
        ],
    )
    .map_err(|e| format!("Failed upserting imported codex tag: {e}"))?;
    Ok(())
}

fn upsert_codex_entry_tag(
    conn: &Connection,
    series_id: &str,
    entry_tag: &CodexEntryTag,
) -> Result<(), String> {
    let payload_json = serde_json::to_string(entry_tag).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO codex_entry_tags(id, series_id, entry_id, tag_id, payload_json)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            entry_id = excluded.entry_id,
            tag_id = excluded.tag_id,
            payload_json = excluded.payload_json
        "#,
        params![
            entry_tag.id,
            series_id,
            entry_tag.entry_id,
            entry_tag.tag_id,
            payload_json
        ],
    )
    .map_err(|e| format!("Failed upserting imported codex entry tag: {e}"))?;
    Ok(())
}

fn upsert_codex_template(
    conn: &Connection,
    series_id: &str,
    template: &CodexTemplate,
) -> Result<(), String> {
    let payload_json = serde_json::to_string(template).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO codex_templates(id, series_id, payload_json, created_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            payload_json = excluded.payload_json,
            created_at = excluded.created_at
        "#,
        params![template.id, series_id, payload_json, template.created_at],
    )
    .map_err(|e| format!("Failed upserting imported codex template: {e}"))?;
    Ok(())
}

fn upsert_codex_relation_type(
    conn: &Connection,
    series_id: &str,
    relation_type: &CodexRelationType,
) -> Result<(), String> {
    let payload_json = serde_json::to_string(relation_type).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO codex_relation_types(id, series_id, payload_json)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            payload_json = excluded.payload_json
        "#,
        params![relation_type.id, series_id, payload_json],
    )
    .map_err(|e| format!("Failed upserting imported codex relation type: {e}"))?;
    Ok(())
}

fn upsert_scene_codex_link(
    conn: &Connection,
    series_id: &str,
    link: &SceneCodexLink,
) -> Result<(), String> {
    let payload_json = serde_json::to_string(link).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO scene_codex_links(id, series_id, scene_id, codex_id, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            scene_id = excluded.scene_id,
            codex_id = excluded.codex_id,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            link.id,
            series_id,
            link.scene_id,
            link.codex_id,
            payload_json,
            link.created_at,
            link.updated_at,
        ],
    )
    .map_err(|e| format!("Failed upserting imported scene codex link: {e}"))?;
    Ok(())
}

fn import_codex_graph(
    payload_conn: &Connection,
    app_conn: &Connection,
    old_series_id: &str,
    target_series_id: &str,
    project_id_map: &HashMap<String, String>,
    scene_id_map: &HashMap<String, String>,
) -> Result<(), String> {
    let mut relation_type_map: HashMap<String, String> = HashMap::new();
    let mut template_map: HashMap<String, String> = HashMap::new();
    let mut entry_map: HashMap<String, String> = HashMap::new();
    let mut tag_map: HashMap<String, String> = HashMap::new();

    {
        let mut stmt = payload_conn
            .prepare(
                "SELECT payload_json FROM codex_relation_types WHERE series_id = ?1 ORDER BY id ASC",
            )
            .map_err(|e| format!("Failed preparing relation-type import query: {e}"))?;
        let rows = stmt
            .query_map(params![old_series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying relation-type payloads: {e}"))?;

        for row in rows {
            let payload = row.map_err(|e| format!("Failed decoding relation-type payload: {e}"))?;
            let mut rel_type: CodexRelationType = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid relation-type payload in package: {e}"))?;
            let old_id = rel_type.id.clone();
            rel_type.id = uuid::Uuid::new_v4().to_string();
            relation_type_map.insert(old_id, rel_type.id.clone());
            upsert_codex_relation_type(app_conn, target_series_id, &rel_type)?;
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                "SELECT payload_json FROM codex_templates WHERE series_id = ?1 ORDER BY created_at DESC",
            )
            .map_err(|e| format!("Failed preparing template import query: {e}"))?;
        let rows = stmt
            .query_map(params![old_series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying template payloads: {e}"))?;

        for row in rows {
            let payload = row.map_err(|e| format!("Failed decoding template payload: {e}"))?;
            let mut template: CodexTemplate = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid template payload in package: {e}"))?;
            let old_id = template.id.clone();
            template.id = uuid::Uuid::new_v4().to_string();
            template_map.insert(old_id, template.id.clone());
            upsert_codex_template(app_conn, target_series_id, &template)?;
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                "SELECT payload_json FROM codex_entries WHERE series_id = ?1 ORDER BY updated_at DESC",
            )
            .map_err(|e| format!("Failed preparing codex-entry import query: {e}"))?;
        let rows = stmt
            .query_map(params![old_series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying codex-entry payloads: {e}"))?;

        for row in rows {
            let payload = row.map_err(|e| format!("Failed decoding codex-entry payload: {e}"))?;
            let mut entry: CodexEntry = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid codex-entry payload in package: {e}"))?;

            let old_id = entry.id.clone();
            entry.id = uuid::Uuid::new_v4().to_string();
            if let Some(old_project_id) = entry.project_id.clone() {
                entry.project_id = project_id_map.get(&old_project_id).cloned();
            }
            if let Some(old_template_id) = entry.template_id.clone() {
                entry.template_id = template_map.get(&old_template_id).cloned();
            }

            let payload_json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
            let aliases_json = serde_json::to_string(&entry.aliases).map_err(|e| e.to_string())?;
            app_conn
                .execute(
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
                        target_series_id,
                        entry.category,
                        entry.name,
                        aliases_json,
                        payload_json,
                        entry.created_at,
                        entry.updated_at,
                    ],
                )
                .map_err(|e| format!("Failed inserting imported codex entry: {e}"))?;

            entry_map.insert(old_id, entry.id);
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                "SELECT payload_json FROM codex_tags WHERE series_id = ?1 ORDER BY updated_at DESC",
            )
            .map_err(|e| format!("Failed preparing codex-tag import query: {e}"))?;
        let rows = stmt
            .query_map(params![old_series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying codex-tag payloads: {e}"))?;

        for row in rows {
            let payload = row.map_err(|e| format!("Failed decoding codex-tag payload: {e}"))?;
            let mut tag: CodexTag = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid codex-tag payload in package: {e}"))?;
            let old_id = tag.id.clone();
            tag.id = uuid::Uuid::new_v4().to_string();
            if let Some(old_project_id) = tag.project_id.clone() {
                tag.project_id = project_id_map.get(&old_project_id).cloned();
            }
            tag_map.insert(old_id, tag.id.clone());
            upsert_codex_tag(app_conn, target_series_id, &tag)?;
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                "SELECT payload_json FROM codex_entry_tags WHERE series_id = ?1 ORDER BY id ASC",
            )
            .map_err(|e| format!("Failed preparing codex-entry-tag import query: {e}"))?;
        let rows = stmt
            .query_map(params![old_series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying codex-entry-tag payloads: {e}"))?;

        for row in rows {
            let payload =
                row.map_err(|e| format!("Failed decoding codex-entry-tag payload: {e}"))?;
            let mut entry_tag: CodexEntryTag = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid codex-entry-tag payload in package: {e}"))?;
            let Some(mapped_entry_id) = entry_map.get(&entry_tag.entry_id).cloned() else {
                continue;
            };
            let Some(mapped_tag_id) = tag_map.get(&entry_tag.tag_id).cloned() else {
                continue;
            };

            entry_tag.id = uuid::Uuid::new_v4().to_string();
            entry_tag.entry_id = mapped_entry_id;
            entry_tag.tag_id = mapped_tag_id;
            upsert_codex_entry_tag(app_conn, target_series_id, &entry_tag)?;
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                "SELECT payload_json FROM codex_relations WHERE series_id = ?1 ORDER BY updated_at DESC",
            )
            .map_err(|e| format!("Failed preparing codex-relation import query: {e}"))?;
        let rows = stmt
            .query_map(params![old_series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying codex-relation payloads: {e}"))?;

        for row in rows {
            let payload =
                row.map_err(|e| format!("Failed decoding codex-relation payload: {e}"))?;
            let mut relation: CodexRelation = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid codex-relation payload in package: {e}"))?;

            let Some(parent_id) = entry_map.get(&relation.parent_id).cloned() else {
                continue;
            };
            let Some(child_id) = entry_map.get(&relation.child_id).cloned() else {
                continue;
            };

            relation.id = uuid::Uuid::new_v4().to_string();
            relation.parent_id = parent_id;
            relation.child_id = child_id;
            if let Some(old_project_id) = relation.project_id.clone() {
                relation.project_id = project_id_map.get(&old_project_id).cloned();
            }
            if let Some(old_type_id) = relation.type_id.clone() {
                relation.type_id = relation_type_map.get(&old_type_id).cloned();
            }

            let payload_json = serde_json::to_string(&relation).map_err(|e| e.to_string())?;
            app_conn
                .execute(
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
                        target_series_id,
                        relation.parent_id,
                        relation.child_id,
                        payload_json,
                        relation.created_at,
                        relation.updated_at,
                    ],
                )
                .map_err(|e| format!("Failed inserting imported codex relation: {e}"))?;
        }
    }

    {
        let mut stmt = payload_conn
            .prepare(
                "SELECT payload_json FROM scene_codex_links WHERE series_id = ?1 ORDER BY updated_at DESC",
            )
            .map_err(|e| format!("Failed preparing scene-codex-link import query: {e}"))?;
        let rows = stmt
            .query_map(params![old_series_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed querying scene-codex-link payloads: {e}"))?;

        for row in rows {
            let payload =
                row.map_err(|e| format!("Failed decoding scene-codex-link payload: {e}"))?;
            let mut link: SceneCodexLink = serde_json::from_str(&payload)
                .map_err(|e| format!("Invalid scene-codex-link payload in package: {e}"))?;

            let Some(mapped_codex_id) = entry_map.get(&link.codex_id).cloned() else {
                continue;
            };
            let Some(mapped_scene_id) = scene_id_map.get(&link.scene_id).cloned() else {
                continue;
            };
            let Some(mapped_project_id) = project_id_map.get(&link.project_id).cloned() else {
                continue;
            };

            link.id = uuid::Uuid::new_v4().to_string();
            link.codex_id = mapped_codex_id;
            link.scene_id = mapped_scene_id;
            link.project_id = mapped_project_id;
            upsert_scene_codex_link(app_conn, target_series_id, &link)?;
        }
    }

    Ok(())
}

fn payload_series_seed(conn: &Connection) -> Result<Option<Series>, String> {
    conn.query_row(
        r#"
        SELECT id, title, description, author, genre, status, created_at, updated_at
        FROM series
        ORDER BY updated_at DESC
        LIMIT 1
        "#,
        [],
        |row| {
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
        },
    )
    .optional()
    .map_err(|e| format!("Failed reading payload series seed: {e}"))
}

fn ensure_target_series_for_novel(
    app_conn: &Connection,
    payload_series: Option<&Series>,
    options: BackupImportOptions,
) -> Result<String, String> {
    if let Some(series_id) = options.target_series_id {
        let exists: bool = app_conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM series WHERE id = ?1)",
                params![series_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed validating target series id: {e}"))?;
        if !exists {
            return Err("Target series does not exist".to_string());
        }
        return Ok(series_id);
    }

    let title = options
        .create_series_title
        .filter(|value| !value.trim().is_empty())
        .or_else(|| payload_series.map(|series| series.title.clone()))
        .unwrap_or_else(|| "Imported Series".to_string());

    let created = crate::commands::series::create_series(
        title,
        payload_series.and_then(|series| series.description.clone()),
        payload_series.and_then(|series| series.author.clone()),
        payload_series.and_then(|series| series.genre.clone()),
        payload_series.and_then(|series| series.status.clone()),
    )?;

    Ok(created.id)
}

fn import_series_package_payload(prepared: &PreparedPackage) -> Result<BackupImportResult, String> {
    let payload_conn = Connection::open(&prepared.payload_db_path)
        .map_err(|e| format!("Failed opening series package payload DB: {e}"))?;
    let app_conn = open_app_db()?;

    let seed_series = payload_series_seed(&payload_conn)?
        .ok_or("Series package payload is missing series metadata")?;

    let created_series = crate::commands::series::create_series(
        seed_series.title.clone(),
        seed_series.description.clone(),
        seed_series.author.clone(),
        seed_series.genre.clone(),
        seed_series.status.clone(),
    )?;

    let projects = series_project_ids_and_paths(&payload_conn, &seed_series.id)?;
    let fs_root = prepared
        .fs_root
        .as_ref()
        .ok_or("Series package extraction did not provide filesystem payload")?;

    let mut imported_project_ids = Vec::new();
    let mut project_id_map: HashMap<String, String> = HashMap::new();
    let mut scene_id_map: HashMap<String, String> = HashMap::new();

    for seed in projects {
        let (cloned_project, remapped_scene_ids) =
            import_project_payload(&payload_conn, &app_conn, fs_root, &seed, &created_series.id)?;
        imported_project_ids.push(cloned_project.id.clone());
        project_id_map.insert(seed.id, cloned_project.id);
        for (old_scene_id, new_scene_id) in remapped_scene_ids {
            scene_id_map.insert(old_scene_id, new_scene_id);
        }
    }

    import_codex_graph(
        &payload_conn,
        &app_conn,
        &seed_series.id,
        &created_series.id,
        &project_id_map,
        &scene_id_map,
    )?;

    Ok(BackupImportResult {
        kind: BackupPackageKind::SeriesPackage,
        imported_series_id: Some(created_series.id),
        imported_project_ids,
        replaced_app_data: false,
        checkpoint_path: None,
        requires_relaunch: false,
    })
}

fn import_novel_package_payload(
    prepared: &PreparedPackage,
    options: BackupImportOptions,
) -> Result<BackupImportResult, String> {
    let payload_conn = Connection::open(&prepared.payload_db_path)
        .map_err(|e| format!("Failed opening novel package payload DB: {e}"))?;
    let app_conn = open_app_db()?;

    let payload_series = payload_series_seed(&payload_conn)?;
    let target_series_id =
        ensure_target_series_for_novel(&app_conn, payload_series.as_ref(), options)?;

    let mut stmt = payload_conn
        .prepare(
            r#"
            SELECT id, title, author, description, path, archived, language, cover_image, series_id, series_index
            FROM projects
            ORDER BY updated_at DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| format!("Failed preparing novel-project seed query: {e}"))?;
    let seed = stmt
        .query_row([], |row| {
            Ok(ProjectSeed {
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
            })
        })
        .optional()
        .map_err(|e| format!("Failed loading novel-project seed row: {e}"))?
        .ok_or("Novel package payload has no project row")?;

    let fs_root = prepared
        .fs_root
        .as_ref()
        .ok_or("Novel package extraction did not provide filesystem payload")?;

    let (cloned_project, scene_map) =
        import_project_payload(&payload_conn, &app_conn, fs_root, &seed, &target_series_id)?;

    let mut project_map = HashMap::new();
    project_map.insert(seed.id.clone(), cloned_project.id.clone());

    import_codex_graph(
        &payload_conn,
        &app_conn,
        &seed.series_id,
        &target_series_id,
        &project_map,
        &scene_map,
    )?;

    Ok(BackupImportResult {
        kind: BackupPackageKind::NovelPackage,
        imported_series_id: Some(target_series_id),
        imported_project_ids: vec![cloned_project.id],
        replaced_app_data: false,
        checkpoint_path: None,
        requires_relaunch: false,
    })
}

fn remove_path_if_exists(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    if path.is_dir() {
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed removing directory '{}': {e}", path.display()))?;
    } else {
        fs::remove_file(path)
            .map_err(|e| format!("Failed removing file '{}': {e}", path.display()))?;
    }

    Ok(())
}

fn enforce_secrets_excluded_after_restore(db_path: &Path) -> Result<(), String> {
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed opening restored DB to enforce secret exclusion: {e}"))?;
    conn.execute("DELETE FROM secure_secrets", [])
        .map_err(|e| format!("Failed clearing restored secure secrets: {e}"))?;
    conn.execute("DELETE FROM secure_accounts", [])
        .map_err(|e| format!("Failed clearing restored secure accounts: {e}"))?;
    Ok(())
}

fn import_full_snapshot_payload(prepared: &PreparedPackage) -> Result<BackupImportResult, String> {
    let app_dir = get_app_dir()?;
    let checkpoints_dir = app_dir.join(".meta").join("checkpoints");
    fs::create_dir_all(&checkpoints_dir).map_err(|e| e.to_string())?;

    let checkpoint_path = checkpoints_dir.join(format!(
        "pre_restore_{}.{}",
        now_slug_timestamp(),
        PACKAGE_EXTENSION
    ));

    let checkpoint_summary = build_package(
        BackupPackageKind::FullSnapshot,
        Some(checkpoint_path.to_string_lossy().to_string()),
        None,
        None,
    )?;

    let incoming_fs_root = prepared
        .fs_root
        .as_ref()
        .ok_or("Full snapshot extraction did not provide filesystem payload")?;

    let target_db_path = app_db_path()?;
    if let Some(parent) = target_db_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let projects_path = app_dir.join("Projects");
    let trash_path = app_dir.join("Trash");
    remove_path_if_exists(&target_db_path)?;
    fs::copy(&prepared.payload_db_path, &target_db_path).map_err(|e| {
        format!(
            "Full snapshot restore failed while replacing DB '{}': {e}. Checkpoint package: {}",
            target_db_path.display(),
            checkpoint_summary.path
        )
    })?;

    remove_path_if_exists(&projects_path)?;
    remove_path_if_exists(&trash_path)?;
    copy_directory_recursive(&incoming_fs_root.join("Projects"), &projects_path).map_err(|e| {
        format!(
            "Full snapshot restore failed while replacing Projects: {e}. Checkpoint package: {}",
            checkpoint_summary.path
        )
    })?;
    copy_directory_recursive(&incoming_fs_root.join("Trash"), &trash_path).map_err(|e| {
        format!(
            "Full snapshot restore failed while replacing Trash: {e}. Checkpoint package: {}",
            checkpoint_summary.path
        )
    })?;
    enforce_secrets_excluded_after_restore(&target_db_path)?;

    let emergency_dir = app_dir.join(".emergency_backups");
    if emergency_dir.exists() {
        let _ = fs::remove_dir_all(&emergency_dir);
    }

    Ok(BackupImportResult {
        kind: BackupPackageKind::FullSnapshot,
        imported_series_id: None,
        imported_project_ids: Vec::new(),
        replaced_app_data: true,
        checkpoint_path: Some(checkpoint_summary.path),
        requires_relaunch: true,
    })
}

#[tauri::command]
pub fn export_full_snapshot(output_path: Option<String>) -> Result<BackupPackageSummary, String> {
    build_package(BackupPackageKind::FullSnapshot, output_path, None, None)
}

#[tauri::command]
pub fn export_series_package(
    series_id: String,
    output_path: Option<String>,
) -> Result<BackupPackageSummary, String> {
    if series_id.trim().is_empty() {
        return Err("Series ID is required".to_string());
    }
    build_package(
        BackupPackageKind::SeriesPackage,
        output_path,
        Some(series_id),
        None,
    )
}

#[tauri::command]
pub fn export_novel_package(
    project_id: String,
    output_path: Option<String>,
) -> Result<BackupPackageSummary, String> {
    if project_id.trim().is_empty() {
        return Err("Project ID is required".to_string());
    }
    build_package(
        BackupPackageKind::NovelPackage,
        output_path,
        None,
        Some(project_id),
    )
}

#[tauri::command]
pub fn inspect_backup_package(package_path: String) -> Result<BackupPackageInfo, String> {
    let prepared = prepare_package(&package_path, false)?;
    let info = BackupPackageInfo {
        kind: prepared.manifest.kind,
        app_version: prepared.manifest.app_version,
        schema_version: prepared.manifest.schema_version,
        created_at: prepared.manifest.created_at,
        counts: prepared.manifest.counts,
        source_hints: prepared.manifest.source_hints,
    };

    Ok(info)
}

#[tauri::command]
pub fn import_backup_package(
    package_path: String,
    options: Option<BackupImportOptions>,
) -> Result<BackupImportResult, String> {
    let prepared = prepare_package(&package_path, true)?;
    let options = options.unwrap_or_default();

    match prepared.manifest.kind {
        BackupPackageKind::FullSnapshot => import_full_snapshot_payload(&prepared),
        BackupPackageKind::SeriesPackage => import_series_package_payload(&prepared),
        BackupPackageKind::NovelPackage => import_novel_package_payload(&prepared, options),
    }
}

#[tauri::command]
pub fn read_file_bytes(file_path: String) -> Result<Vec<u8>, String> {
    let path = PathBuf::from(file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }
    fs::read(path).map_err(|e| format!("Failed to read file bytes: {e}"))
}

#[tauri::command]
pub fn write_temp_backup_file(file_name: String, data: Vec<u8>) -> Result<String, String> {
    let safe_name = file_name
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '.' || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();

    let app_dir = get_app_dir()?;
    let imports_dir = app_dir.join(".meta").join("imports");
    fs::create_dir_all(&imports_dir).map_err(|e| e.to_string())?;

    let final_name = if safe_name.trim().is_empty() {
        format!("import_{}.{}", now_slug_timestamp(), PACKAGE_EXTENSION)
    } else if safe_name
        .to_lowercase()
        .ends_with(&format!(".{PACKAGE_EXTENSION}"))
    {
        format!("{}_{}", now_slug_timestamp(), safe_name)
    } else {
        format!(
            "{}_{}.{}",
            now_slug_timestamp(),
            safe_name,
            PACKAGE_EXTENSION
        )
    };

    let target = imports_dir.join(final_name);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&target, data).map_err(|e| format!("Failed writing temp backup file: {e}"))?;
    Ok(target.to_string_lossy().to_string())
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
