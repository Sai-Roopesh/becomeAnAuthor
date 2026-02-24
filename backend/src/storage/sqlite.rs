use rusqlite::{Connection, OptionalExtension, params};
use std::path::PathBuf;
use std::time::Duration;

use crate::utils::get_app_dir;

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
        PRAGMA synchronous = FULL;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;

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

        CREATE INDEX IF NOT EXISTS idx_secure_accounts_namespace_provider
            ON secure_accounts(namespace, provider);
        "#,
    )
    .map_err(|e| format!("Failed to initialize SQLite schema: {e}"))?;
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

pub fn get_search_signature(conn: &Connection, project_path: &str) -> Result<Option<String>, String> {
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
        providers.push(row.map_err(|e| format!("Failed to decode secure account provider row: {e}"))?);
    }
    Ok(providers)
}
