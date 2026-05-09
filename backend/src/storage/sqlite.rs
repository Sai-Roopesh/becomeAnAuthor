use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;

use crate::utils::get_app_dir;

const SCHEMA_VERSION: i64 = 2;

fn app_database_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let meta_dir = app_dir.join(".meta");
    std::fs::create_dir_all(&meta_dir)
        .map_err(|e| format!("Failed to create .meta directory for SQLite DB: {e}"))?;
    Ok(meta_dir.join("app.db"))
}

fn initialize_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
        "#,
    )
    .map_err(|e| format!("Failed to configure SQLite pragmas: {e}"))?;

    let user_version: i64 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| format!("Failed to read SQLite user_version: {e}"))?;
    if user_version > SCHEMA_VERSION {
        return Err(format!(
            "Unsupported DB schema version {user_version} (max supported: {SCHEMA_VERSION})"
        ));
    }

    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            description TEXT NOT NULL,
            archived INTEGER NOT NULL DEFAULT 0,
            language TEXT,
            cover_image TEXT,
            series_id TEXT NOT NULL,
            series_index TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recent_projects (
            project_path TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            last_opened INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS deleted_projects (
            project_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            original_path TEXT NOT NULL,
            trash_path TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            deleted_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_deleted_projects_deleted_at
            ON deleted_projects(deleted_at DESC);

        CREATE TABLE IF NOT EXISTS series (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            author TEXT,
            genre TEXT,
            status TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS deleted_series_registry (
            old_series_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            author TEXT,
            genre TEXT,
            status TEXT,
            deleted_at INTEGER NOT NULL,
            restored_series_id TEXT
        );

        CREATE TABLE IF NOT EXISTS structure_nodes (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            parent_id TEXT,
            node_type TEXT NOT NULL,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            scene_file TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_structure_nodes_project_parent_order
            ON structure_nodes(project_id, parent_id, order_index);

        CREATE TABLE IF NOT EXISTS scene_metadata (
            scene_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            scene_file TEXT NOT NULL,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            status TEXT NOT NULL,
            word_count INTEGER NOT NULL,
            pov_character TEXT,
            subtitle TEXT,
            labels_json TEXT NOT NULL,
            exclude_from_ai INTEGER NOT NULL DEFAULT 0,
            summary TEXT NOT NULL DEFAULT '',
            archived INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(project_id, scene_file)
        );

        CREATE INDEX IF NOT EXISTS idx_scene_metadata_project_order
            ON scene_metadata(project_id, order_index);

        CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content_json TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_snippets_project_updated
            ON snippets(project_id, updated_at DESC);

        CREATE TABLE IF NOT EXISTS scene_notes (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            scene_id TEXT NOT NULL,
            content_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(project_id, scene_id)
        );

        CREATE TABLE IF NOT EXISTS codex_entries (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            aliases_json TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_codex_entries_series_category
            ON codex_entries(series_id, category, updated_at DESC);

        CREATE TABLE IF NOT EXISTS codex_relations (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            parent_id TEXT NOT NULL,
            child_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_codex_relations_series
            ON codex_relations(series_id, updated_at DESC);

        CREATE TABLE IF NOT EXISTS codex_tags (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_codex_tags_series
            ON codex_tags(series_id, updated_at DESC);

        CREATE TABLE IF NOT EXISTS codex_entry_tags (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            entry_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            payload_json TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_codex_entry_tags_series_entry
            ON codex_entry_tags(series_id, entry_id);

        CREATE TABLE IF NOT EXISTS codex_templates (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_codex_templates_series
            ON codex_templates(series_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS codex_relation_types (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            payload_json TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_codex_relation_types_series
            ON codex_relation_types(series_id);

        CREATE TABLE IF NOT EXISTS scene_codex_links (
            id TEXT PRIMARY KEY,
            series_id TEXT NOT NULL,
            scene_id TEXT NOT NULL,
            codex_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_scene_codex_links_series_scene
            ON scene_codex_links(series_id, scene_id, updated_at DESC);

        CREATE TABLE IF NOT EXISTS chat_threads (
            project_path TEXT NOT NULL,
            id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0,
            deleted_at INTEGER,
            default_model TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY(project_path, id)
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            project_path TEXT NOT NULL,
            id TEXT NOT NULL,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            model TEXT,
            timestamp INTEGER NOT NULL,
            PRIMARY KEY(project_path, id),
            FOREIGN KEY(project_path, thread_id)
                REFERENCES chat_threads(project_path, id)
                ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_chat_threads_project_updated
            ON chat_threads(project_path, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_project_thread_ts
            ON chat_messages(project_path, thread_id, timestamp ASC);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id
            ON chat_messages(project_path, id);

        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
            project_path UNINDEXED,
            doc_type UNINDEXED,
            doc_id UNINDEXED,
            title,
            body,
            category UNINDEXED,
            path UNINDEXED,
            tokenize = 'unicode61 remove_diacritics 2'
        );

        CREATE TABLE IF NOT EXISTS search_sync_state (
            project_path TEXT PRIMARY KEY,
            signature TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS secure_accounts (
            namespace TEXT NOT NULL,
            provider TEXT NOT NULL,
            connection_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            PRIMARY KEY(namespace, provider, connection_id)
        );

        CREATE TABLE IF NOT EXISTS secure_secrets (
            namespace TEXT NOT NULL,
            provider TEXT NOT NULL,
            connection_id TEXT NOT NULL,
            nonce BLOB NOT NULL,
            ciphertext BLOB NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY(namespace, provider, connection_id),
            FOREIGN KEY(namespace, provider, connection_id)
                REFERENCES secure_accounts(namespace, provider, connection_id)
                ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_secure_accounts_namespace_provider
            ON secure_accounts(namespace, provider);

        CREATE INDEX IF NOT EXISTS idx_secure_secrets_namespace_provider
            ON secure_secrets(namespace, provider);

        CREATE TABLE IF NOT EXISTS app_preferences (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            custom_endpoint TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_connection_models (
            connection_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            PRIMARY KEY (connection_id, model_id),
            FOREIGN KEY (connection_id) REFERENCES ai_connections(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_ai_connections_provider_enabled
            ON ai_connections(provider, enabled);

        CREATE TABLE IF NOT EXISTS model_discovery_cache (
            provider TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            cached_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            PRIMARY KEY (provider, endpoint)
        );

        CREATE INDEX IF NOT EXISTS idx_model_discovery_cache_expires_at
            ON model_discovery_cache(expires_at);

        CREATE TABLE IF NOT EXISTS yjs_snapshots (
            project_path TEXT NOT NULL,
            scene_id TEXT NOT NULL,
            update_blob BLOB NOT NULL,
            saved_at INTEGER NOT NULL,
            PRIMARY KEY (project_path, scene_id)
        );

        CREATE INDEX IF NOT EXISTS idx_yjs_snapshots_project_saved
            ON yjs_snapshots(project_path, saved_at DESC);

        CREATE TABLE IF NOT EXISTS yjs_update_log (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            project_path TEXT NOT NULL,
            scene_id TEXT NOT NULL,
            update_blob BLOB NOT NULL,
            saved_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_yjs_update_log_project_scene_seq
            ON yjs_update_log(project_path, scene_id, seq);
        "#,
    )
    .map_err(|e| format!("Failed to initialize SQLite schema: {e}"))?;

    conn.execute_batch(&format!(
        "PRAGMA user_version = {SCHEMA_VERSION}; PRAGMA optimize;"
    ))
    .map_err(|e| format!("Failed to finalize SQLite schema setup: {e}"))?;
    Ok(())
}

pub fn open_app_db() -> Result<Connection, String> {
    let db_path = app_database_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open SQLite DB at '{}': {e}", db_path.display()))?;
    conn.busy_timeout(Duration::from_secs(5))
        .map_err(|e| format!("Failed to set SQLite busy timeout: {e}"))?;
    initialize_schema(&conn)?;
    Ok(conn)
}

pub fn get_search_signature(
    conn: &Connection,
    project_path: &str,
) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT signature FROM search_sync_state WHERE project_path = ?1",
        params![project_path],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("Failed to read search sync state: {e}"))
}

pub fn set_search_signature(
    conn: &Connection,
    project_path: &str,
    signature: &str,
    updated_at: i64,
) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO search_sync_state (project_path, signature, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(project_path) DO UPDATE SET
            signature = excluded.signature,
            updated_at = excluded.updated_at
        "#,
        params![project_path, signature, updated_at],
    )
    .map_err(|e| format!("Failed to persist search sync state: {e}"))?;
    Ok(())
}

pub fn clear_search_index(conn: &Connection, project_path: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM search_index WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to clear search index rows: {e}"))?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn upsert_search_document(
    conn: &Connection,
    project_path: &str,
    doc_type: &str,
    doc_id: &str,
    title: &str,
    body: &str,
    category: Option<&str>,
    path: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM search_index WHERE project_path = ?1 AND doc_type = ?2 AND doc_id = ?3",
        params![project_path, doc_type, doc_id],
    )
    .map_err(|e| format!("Failed to delete stale search index row: {e}"))?;

    conn.execute(
        r#"
        INSERT INTO search_index (project_path, doc_type, doc_id, title, body, category, path)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        params![project_path, doc_type, doc_id, title, body, category, path],
    )
    .map_err(|e| format!("Failed to insert search index row: {e}"))?;

    Ok(())
}

pub fn upsert_secure_account(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
    created_at: i64,
) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO secure_accounts(namespace, provider, connection_id, created_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(namespace, provider, connection_id) DO UPDATE SET
            created_at = excluded.created_at
        "#,
        params![namespace, provider, connection_id, created_at],
    )
    .map_err(|e| format!("Failed to upsert secure account metadata: {e}"))?;
    Ok(())
}

pub fn delete_secure_account(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM secure_accounts WHERE namespace = ?1 AND provider = ?2 AND connection_id = ?3",
        params![namespace, provider, connection_id],
    )
    .map_err(|e| format!("Failed to delete secure account metadata: {e}"))?;
    Ok(())
}

pub fn list_secure_account_providers(
    conn: &Connection,
    namespace: &str,
) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT provider FROM secure_accounts WHERE namespace = ?1 ORDER BY provider ASC",
        )
        .map_err(|e| format!("Failed to prepare secure account provider query: {e}"))?;

    let rows = stmt
        .query_map(params![namespace], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to execute secure account provider query: {e}"))?;

    let mut providers = Vec::new();
    for row in rows {
        providers
            .push(row.map_err(|e| format!("Failed to decode secure account provider row: {e}"))?);
    }
    Ok(providers)
}

pub fn upsert_secure_secret(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
    nonce: &[u8],
    ciphertext: &[u8],
    updated_at: i64,
) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO secure_secrets(namespace, provider, connection_id, nonce, ciphertext, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(namespace, provider, connection_id) DO UPDATE SET
            nonce = excluded.nonce,
            ciphertext = excluded.ciphertext,
            updated_at = excluded.updated_at
        "#,
        params![
            namespace,
            provider,
            connection_id,
            nonce,
            ciphertext,
            updated_at
        ],
    )
    .map_err(|e| format!("Failed to upsert secure secret: {e}"))?;
    Ok(())
}

pub type SecureSecretData = (Vec<u8>, Vec<u8>);

pub fn get_secure_secret(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
) -> Result<Option<SecureSecretData>, String> {
    conn.query_row(
        r#"
        SELECT nonce, ciphertext
        FROM secure_secrets
        WHERE namespace = ?1 AND provider = ?2 AND connection_id = ?3
        "#,
        params![namespace, provider, connection_id],
        |row| {
            let nonce = row.get::<_, Vec<u8>>(0)?;
            let ciphertext = row.get::<_, Vec<u8>>(1)?;
            Ok((nonce, ciphertext))
        },
    )
    .optional()
    .map_err(|e| format!("Failed to read secure secret: {e}"))
}

pub fn delete_secure_secret(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM secure_secrets WHERE namespace = ?1 AND provider = ?2 AND connection_id = ?3",
        params![namespace, provider, connection_id],
    )
    .map_err(|e| format!("Failed to delete secure secret: {e}"))?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIConnectionRecord {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub custom_endpoint: Option<String>,
    pub enabled: bool,
    pub models: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelDiscoveryCacheRecord {
    pub provider: String,
    pub endpoint: String,
    pub payload_json: String,
    pub cached_at: i64,
    pub expires_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YjsSnapshotRecord {
    pub project_path: String,
    pub scene_id: String,
    pub update_blob: Vec<u8>,
    pub saved_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YjsUpdateLogRecord {
    pub seq: i64,
    pub project_path: String,
    pub scene_id: String,
    pub update_blob: Vec<u8>,
    pub saved_at: i64,
}

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

pub fn app_pref_get(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT value_json FROM app_preferences WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("Failed to read app preference: {e}"))
}

pub fn app_pref_get_many(
    conn: &Connection,
    keys: &[String],
) -> Result<Vec<(String, String)>, String> {
    if keys.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = vec!["?"; keys.len()].join(",");
    let sql = format!(
        "SELECT key, value_json FROM app_preferences WHERE key IN ({})",
        placeholders
    );

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare app_pref_get_many query: {e}"))?;
    let params = rusqlite::params_from_iter(keys.iter());
    let rows = stmt
        .query_map(params, |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to execute app_pref_get_many query: {e}"))?;

    let mut values = Vec::new();
    for row in rows {
        values.push(row.map_err(|e| format!("Failed to decode app preference row: {e}"))?);
    }
    Ok(values)
}

pub fn app_pref_set(
    conn: &Connection,
    key: &str,
    value_json: &str,
    updated_at: i64,
) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO app_preferences(key, value_json, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = excluded.updated_at
        "#,
        params![key, value_json, updated_at],
    )
    .map_err(|e| format!("Failed to write app preference: {e}"))?;
    Ok(())
}

pub fn app_pref_delete(conn: &Connection, key: &str) -> Result<(), String> {
    conn.execute("DELETE FROM app_preferences WHERE key = ?1", params![key])
        .map_err(|e| format!("Failed to delete app preference: {e}"))?;
    Ok(())
}

pub fn list_ai_connections(conn: &Connection) -> Result<Vec<AIConnectionRecord>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, name, provider, custom_endpoint, enabled, created_at, updated_at
            FROM ai_connections
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|e| format!("Failed to prepare ai connection list query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, i64>(4)? != 0,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|e| format!("Failed to execute ai connection list query: {e}"))?;

    let mut results = Vec::new();
    for row in rows {
        let (id, name, provider, custom_endpoint, enabled, created_at, updated_at) =
            row.map_err(|e| format!("Failed to decode ai connection row: {e}"))?;
        let models = list_ai_connection_models(conn, &id)?;
        results.push(AIConnectionRecord {
            id,
            name,
            provider,
            custom_endpoint,
            enabled,
            models,
            created_at,
            updated_at,
        });
    }

    Ok(results)
}

pub fn get_ai_connection(
    conn: &Connection,
    connection_id: &str,
) -> Result<Option<AIConnectionRecord>, String> {
    let row = conn
        .query_row(
            r#"
            SELECT id, name, provider, custom_endpoint, enabled, created_at, updated_at
            FROM ai_connections
            WHERE id = ?1
            "#,
            params![connection_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, i64>(4)? != 0,
                    row.get::<_, i64>(5)?,
                    row.get::<_, i64>(6)?,
                ))
            },
        )
        .optional()
        .map_err(|e| format!("Failed to read ai connection row: {e}"))?;

    let Some((id, name, provider, custom_endpoint, enabled, created_at, updated_at)) = row else {
        return Ok(None);
    };

    let models = list_ai_connection_models(conn, &id)?;
    Ok(Some(AIConnectionRecord {
        id,
        name,
        provider,
        custom_endpoint,
        enabled,
        models,
        created_at,
        updated_at,
    }))
}

pub fn save_ai_connection(
    conn: &Connection,
    row: &AIConnectionRecord,
) -> Result<AIConnectionRecord, String> {
    conn.execute(
        r#"
        INSERT INTO ai_connections(id, name, provider, custom_endpoint, enabled, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            provider = excluded.provider,
            custom_endpoint = excluded.custom_endpoint,
            enabled = excluded.enabled,
            updated_at = excluded.updated_at
        "#,
        params![
            row.id,
            row.name,
            row.provider,
            row.custom_endpoint,
            bool_to_sql(row.enabled),
            row.created_at,
            row.updated_at
        ],
    )
    .map_err(|e| format!("Failed to upsert ai connection row: {e}"))?;

    conn.execute(
        "DELETE FROM ai_connection_models WHERE connection_id = ?1",
        params![row.id],
    )
    .map_err(|e| format!("Failed to clear ai connection models: {e}"))?;

    if !row.models.is_empty() {
        let mut stmt = conn
            .prepare(
                "INSERT OR IGNORE INTO ai_connection_models(connection_id, model_id) VALUES (?1, ?2)",
            )
            .map_err(|e| format!("Failed to prepare ai model insert statement: {e}"))?;
        for model in &row.models {
            stmt.execute(params![row.id, model])
                .map_err(|e| format!("Failed to insert ai model row: {e}"))?;
        }
    }

    get_ai_connection(conn, &row.id)?.ok_or_else(|| "AI connection was not saved".to_string())
}

pub fn delete_ai_connection(conn: &Connection, connection_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM ai_connections WHERE id = ?1",
        params![connection_id],
    )
    .map_err(|e| format!("Failed to delete ai connection row: {e}"))?;
    Ok(())
}

pub fn list_ai_connection_models(
    conn: &Connection,
    connection_id: &str,
) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT model_id FROM ai_connection_models WHERE connection_id = ?1 ORDER BY model_id ASC",
        )
        .map_err(|e| format!("Failed to prepare ai model list query: {e}"))?;

    let rows = stmt
        .query_map(params![connection_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to execute ai model list query: {e}"))?;
    let mut models = Vec::new();
    for row in rows {
        models.push(row.map_err(|e| format!("Failed to decode ai model row: {e}"))?);
    }
    Ok(models)
}

pub fn get_model_discovery_cache(
    conn: &Connection,
    provider: &str,
    endpoint: &str,
) -> Result<Option<ModelDiscoveryCacheRecord>, String> {
    conn.query_row(
        r#"
        SELECT provider, endpoint, payload_json, cached_at, expires_at
        FROM model_discovery_cache
        WHERE provider = ?1 AND endpoint = ?2
        "#,
        params![provider, endpoint],
        |row| {
            Ok(ModelDiscoveryCacheRecord {
                provider: row.get(0)?,
                endpoint: row.get(1)?,
                payload_json: row.get(2)?,
                cached_at: row.get(3)?,
                expires_at: row.get(4)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("Failed to read model discovery cache row: {e}"))
}

pub fn set_model_discovery_cache(
    conn: &Connection,
    row: &ModelDiscoveryCacheRecord,
) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO model_discovery_cache(provider, endpoint, payload_json, cached_at, expires_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(provider, endpoint) DO UPDATE SET
            payload_json = excluded.payload_json,
            cached_at = excluded.cached_at,
            expires_at = excluded.expires_at
        "#,
        params![
            row.provider,
            row.endpoint,
            row.payload_json,
            row.cached_at,
            row.expires_at
        ],
    )
    .map_err(|e| format!("Failed to upsert model discovery cache row: {e}"))?;
    Ok(())
}

pub fn clear_model_discovery_cache(
    conn: &Connection,
    provider: Option<&str>,
) -> Result<(), String> {
    match provider {
        Some(p) => conn
            .execute(
                "DELETE FROM model_discovery_cache WHERE provider = ?1",
                params![p],
            )
            .map_err(|e| format!("Failed to clear provider model cache: {e}"))?,
        None => conn
            .execute("DELETE FROM model_discovery_cache", [])
            .map_err(|e| format!("Failed to clear model cache: {e}"))?,
    };
    Ok(())
}

pub fn save_yjs_snapshot(
    conn: &Connection,
    row: &YjsSnapshotRecord,
) -> Result<YjsSnapshotRecord, String> {
    conn.execute(
        r#"
        INSERT INTO yjs_snapshots(project_path, scene_id, update_blob, saved_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(project_path, scene_id) DO UPDATE SET
            update_blob = excluded.update_blob,
            saved_at = excluded.saved_at
        "#,
        params![
            row.project_path,
            row.scene_id,
            row.update_blob,
            row.saved_at
        ],
    )
    .map_err(|e| format!("Failed to save yjs snapshot: {e}"))?;

    get_yjs_snapshot(conn, &row.project_path, &row.scene_id)?
        .ok_or_else(|| "Yjs snapshot was not saved".to_string())
}

pub fn get_yjs_snapshot(
    conn: &Connection,
    project_path: &str,
    scene_id: &str,
) -> Result<Option<YjsSnapshotRecord>, String> {
    conn.query_row(
        r#"
        SELECT project_path, scene_id, update_blob, saved_at
        FROM yjs_snapshots
        WHERE project_path = ?1 AND scene_id = ?2
        "#,
        params![project_path, scene_id],
        |row| {
            Ok(YjsSnapshotRecord {
                project_path: row.get(0)?,
                scene_id: row.get(1)?,
                update_blob: row.get(2)?,
                saved_at: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("Failed to read yjs snapshot row: {e}"))
}

pub fn has_yjs_snapshot(
    conn: &Connection,
    project_path: &str,
    scene_id: &str,
) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM yjs_snapshots WHERE project_path = ?1 AND scene_id = ?2",
            params![project_path, scene_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check yjs snapshot: {e}"))?;
    Ok(count > 0)
}

pub fn delete_yjs_snapshot(
    conn: &Connection,
    project_path: &str,
    scene_id: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM yjs_snapshots WHERE project_path = ?1 AND scene_id = ?2",
        params![project_path, scene_id],
    )
    .map_err(|e| format!("Failed to delete yjs snapshot row: {e}"))?;
    Ok(())
}

pub fn append_yjs_update_log(
    conn: &Connection,
    project_path: &str,
    scene_id: &str,
    update_blob: &[u8],
    saved_at: i64,
) -> Result<i64, String> {
    conn.execute(
        r#"
        INSERT INTO yjs_update_log(project_path, scene_id, update_blob, saved_at)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        params![project_path, scene_id, update_blob, saved_at],
    )
    .map_err(|e| format!("Failed to append yjs update log row: {e}"))?;
    Ok(conn.last_insert_rowid())
}

pub fn list_yjs_update_log_since(
    conn: &Connection,
    project_path: &str,
    scene_id: &str,
    min_seq_exclusive: Option<i64>,
) -> Result<Vec<YjsUpdateLogRecord>, String> {
    let mut records = Vec::new();
    if let Some(min_seq) = min_seq_exclusive {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT seq, project_path, scene_id, update_blob, saved_at
                FROM yjs_update_log
                WHERE project_path = ?1 AND scene_id = ?2 AND seq > ?3
                ORDER BY seq ASC
                "#,
            )
            .map_err(|e| format!("Failed to prepare yjs update log query: {e}"))?;
        let rows = stmt
            .query_map(params![project_path, scene_id, min_seq], |row| {
                Ok(YjsUpdateLogRecord {
                    seq: row.get(0)?,
                    project_path: row.get(1)?,
                    scene_id: row.get(2)?,
                    update_blob: row.get(3)?,
                    saved_at: row.get(4)?,
                })
            })
            .map_err(|e| format!("Failed to execute yjs update log query: {e}"))?;
        for row in rows {
            records.push(row.map_err(|e| format!("Failed to decode yjs update log row: {e}"))?);
        }
        return Ok(records);
    }

    let mut stmt = conn
        .prepare(
            r#"
            SELECT seq, project_path, scene_id, update_blob, saved_at
            FROM yjs_update_log
            WHERE project_path = ?1 AND scene_id = ?2
            ORDER BY seq ASC
            "#,
        )
        .map_err(|e| format!("Failed to prepare yjs update log query: {e}"))?;
    let rows = stmt
        .query_map(params![project_path, scene_id], |row| {
            Ok(YjsUpdateLogRecord {
                seq: row.get(0)?,
                project_path: row.get(1)?,
                scene_id: row.get(2)?,
                update_blob: row.get(3)?,
                saved_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to execute yjs update log query: {e}"))?;
    for row in rows {
        records.push(row.map_err(|e| format!("Failed to decode yjs update log row: {e}"))?);
    }
    Ok(records)
}

pub fn delete_yjs_update_log_up_to_seq(
    conn: &Connection,
    project_path: &str,
    scene_id: &str,
    max_seq_inclusive: i64,
) -> Result<(), String> {
    conn.execute(
        r#"
        DELETE FROM yjs_update_log
        WHERE project_path = ?1 AND scene_id = ?2 AND seq <= ?3
        "#,
        params![project_path, scene_id, max_seq_inclusive],
    )
    .map_err(|e| format!("Failed to prune yjs update log rows: {e}"))?;
    Ok(())
}

pub fn delete_all_yjs_update_logs(
    conn: &Connection,
    project_path: &str,
    scene_id: &str,
) -> Result<(), String> {
    conn.execute(
        r#"
        DELETE FROM yjs_update_log
        WHERE project_path = ?1 AND scene_id = ?2
        "#,
        params![project_path, scene_id],
    )
    .map_err(|e| format!("Failed to clear yjs update log rows: {e}"))?;
    Ok(())
}
