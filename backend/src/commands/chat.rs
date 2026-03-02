// Chat commands

use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{ChatMessage, ChatThread};
use crate::storage::open_app_db;
use crate::utils::{validate_json_size, validate_no_null_bytes};

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn sql_to_bool(value: i64) -> bool {
    value != 0
}

fn with_chat_db<F, T>(_project_path: &str, mut f: F) -> Result<T, String>
where
    F: FnMut(&Connection) -> Result<T, String>,
{
    let conn = open_app_db()?;
    f(&conn)
}

#[tauri::command]
pub fn list_chat_threads(project_path: String) -> Result<Vec<ChatThread>, String> {
    with_chat_db(&project_path, |conn| {
        let mut statement = conn
            .prepare(
                r#"
                SELECT id, project_id, name, pinned, archived, deleted_at, default_model, created_at, updated_at
                FROM chat_threads
                WHERE project_path = ?1
                ORDER BY updated_at DESC
                "#,
            )
            .map_err(|e| format!("Failed preparing list_chat_threads query: {e}"))?;
        let mut rows = statement
            .query(params![project_path])
            .map_err(|e| format!("Failed querying chat threads: {e}"))?;
        let mut threads = Vec::new();
        while let Some(row) = rows
            .next()
            .map_err(|e| format!("Failed iterating chat thread rows: {e}"))?
        {
            threads.push(ChatThread {
                id: row
                    .get(0)
                    .map_err(|e| format!("Invalid thread id column: {e}"))?,
                project_id: row
                    .get(1)
                    .map_err(|e| format!("Invalid thread project_id column: {e}"))?,
                name: row
                    .get(2)
                    .map_err(|e| format!("Invalid thread name column: {e}"))?,
                pinned: sql_to_bool(
                    row.get::<_, i64>(3)
                        .map_err(|e| format!("Invalid thread pinned column: {e}"))?,
                ),
                archived: sql_to_bool(
                    row.get::<_, i64>(4)
                        .map_err(|e| format!("Invalid thread archived column: {e}"))?,
                ),
                deleted_at: row
                    .get(5)
                    .map_err(|e| format!("Invalid thread deleted_at column: {e}"))?,
                default_model: row
                    .get(6)
                    .map_err(|e| format!("Invalid thread default_model column: {e}"))?,
                created_at: row
                    .get(7)
                    .map_err(|e| format!("Invalid thread created_at column: {e}"))?,
                updated_at: row
                    .get(8)
                    .map_err(|e| format!("Invalid thread updated_at column: {e}"))?,
            });
        }
        Ok(threads)
    })
}

#[tauri::command]
pub fn get_chat_thread(
    project_path: String,
    thread_id: String,
) -> Result<Option<ChatThread>, String> {
    with_chat_db(&project_path, |conn| {
        conn.query_row(
            r#"
            SELECT id, project_id, name, pinned, archived, deleted_at, default_model, created_at, updated_at
            FROM chat_threads
            WHERE project_path = ?1 AND id = ?2
            "#,
            params![project_path, thread_id],
            |row| {
                Ok(ChatThread {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    pinned: sql_to_bool(row.get::<_, i64>(3)?),
                    archived: sql_to_bool(row.get::<_, i64>(4)?),
                    deleted_at: row.get(5)?,
                    default_model: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(|e| format!("Failed to load chat thread '{thread_id}': {e}"))
    })
}

#[tauri::command]
pub fn create_chat_thread(project_path: String, thread: ChatThread) -> Result<ChatThread, String> {
    validate_no_null_bytes(&thread.name, "Thread name")?;
    with_chat_db(&project_path, |conn| {
        conn.execute(
            r#"
            INSERT INTO chat_threads (
                project_path, id, project_id, name, pinned, archived, deleted_at,
                default_model, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                project_path,
                thread.id,
                thread.project_id,
                thread.name,
                bool_to_sql(thread.pinned),
                bool_to_sql(thread.archived),
                thread.deleted_at,
                thread.default_model,
                thread.created_at,
                thread.updated_at
            ],
        )
        .map_err(|e| format!("Failed to create chat thread: {e}"))?;
        Ok(thread.clone())
    })
}

#[tauri::command]
pub fn update_chat_thread(project_path: String, thread: ChatThread) -> Result<(), String> {
    validate_no_null_bytes(&thread.name, "Thread name")?;
    with_chat_db(&project_path, |conn| {
        let changed = conn
            .execute(
                r#"
                UPDATE chat_threads
                SET project_id = ?3,
                    name = ?4,
                    pinned = ?5,
                    archived = ?6,
                    deleted_at = ?7,
                    default_model = ?8,
                    created_at = ?9,
                    updated_at = ?10
                WHERE project_path = ?1 AND id = ?2
                "#,
                params![
                    project_path,
                    thread.id,
                    thread.project_id,
                    thread.name,
                    bool_to_sql(thread.pinned),
                    bool_to_sql(thread.archived),
                    thread.deleted_at,
                    thread.default_model,
                    thread.created_at,
                    thread.updated_at
                ],
            )
            .map_err(|e| format!("Failed to update chat thread: {e}"))?;
        if changed == 0 {
            return Err("Thread not found".to_string());
        }
        Ok(())
    })
}

#[tauri::command]
pub fn delete_chat_thread(project_path: String, thread_id: String) -> Result<(), String> {
    with_chat_db(&project_path, |conn| {
        conn.execute(
            "DELETE FROM chat_threads WHERE project_path = ?1 AND id = ?2",
            params![project_path, thread_id],
        )
        .map_err(|e| format!("Failed to delete chat thread: {e}"))?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_chat_messages(
    project_path: String,
    thread_id: String,
) -> Result<Vec<ChatMessage>, String> {
    with_chat_db(&project_path, |conn| {
        let mut statement = conn
            .prepare(
                r#"
                SELECT id, thread_id, role, content, model, timestamp
                FROM chat_messages
                WHERE project_path = ?1 AND thread_id = ?2
                ORDER BY timestamp ASC
                "#,
            )
            .map_err(|e| format!("Failed preparing get_chat_messages query: {e}"))?;
        let mut rows = statement
            .query(params![project_path, thread_id])
            .map_err(|e| format!("Failed querying chat messages: {e}"))?;
        let mut messages = Vec::new();
        while let Some(row) = rows
            .next()
            .map_err(|e| format!("Failed iterating chat message rows: {e}"))?
        {
            messages.push(ChatMessage {
                id: row
                    .get(0)
                    .map_err(|e| format!("Invalid message id column: {e}"))?,
                thread_id: row
                    .get(1)
                    .map_err(|e| format!("Invalid message thread_id column: {e}"))?,
                role: row
                    .get(2)
                    .map_err(|e| format!("Invalid message role column: {e}"))?,
                content: row
                    .get(3)
                    .map_err(|e| format!("Invalid message content column: {e}"))?,
                model: row
                    .get(4)
                    .map_err(|e| format!("Invalid message model column: {e}"))?,
                timestamp: row
                    .get(5)
                    .map_err(|e| format!("Invalid message timestamp column: {e}"))?,
            });
        }
        Ok(messages)
    })
}

#[tauri::command]
pub fn find_chat_thread_for_message(
    project_path: String,
    message_id: String,
) -> Result<Option<String>, String> {
    with_chat_db(&project_path, |conn| {
        conn.query_row(
            "SELECT thread_id FROM chat_messages WHERE project_path = ?1 AND id = ?2",
            params![project_path, message_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| format!("Failed to locate chat thread for message: {e}"))
    })
}

#[tauri::command]
pub fn create_chat_message(
    project_path: String,
    message: ChatMessage,
) -> Result<ChatMessage, String> {
    validate_no_null_bytes(&message.content, "Message content")?;
    validate_json_size(&message.content)?;

    with_chat_db(&project_path, |conn| {
        conn.execute(
            r#"
            INSERT INTO chat_messages (
                project_path, id, thread_id, role, content, model, timestamp
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                project_path,
                message.id,
                message.thread_id,
                message.role,
                message.content,
                message.model,
                message.timestamp
            ],
        )
        .map_err(|e| format!("Failed to create chat message: {e}"))?;
        Ok(message.clone())
    })
}

#[tauri::command]
pub fn update_chat_message(
    project_path: String,
    thread_id: String,
    message: ChatMessage,
) -> Result<(), String> {
    validate_no_null_bytes(&message.content, "Message content")?;
    validate_json_size(&message.content)?;

    if message.thread_id != thread_id {
        return Err("Message threadId does not match target thread".to_string());
    }

    with_chat_db(&project_path, |conn| {
        let changed = conn
            .execute(
                r#"
                UPDATE chat_messages
                SET role = ?4, content = ?5, model = ?6, timestamp = ?7
                WHERE project_path = ?1 AND thread_id = ?2 AND id = ?3
                "#,
                params![
                    project_path,
                    thread_id,
                    message.id,
                    message.role,
                    message.content,
                    message.model,
                    message.timestamp
                ],
            )
            .map_err(|e| format!("Failed to update chat message: {e}"))?;
        if changed == 0 {
            return Err("Message not found".to_string());
        }
        Ok(())
    })
}

#[tauri::command]
pub fn delete_chat_message(
    project_path: String,
    thread_id: String,
    message_id: String,
) -> Result<(), String> {
    with_chat_db(&project_path, |conn| {
        conn.execute(
            "DELETE FROM chat_messages WHERE project_path = ?1 AND thread_id = ?2 AND id = ?3",
            params![project_path, thread_id, message_id],
        )
        .map_err(|e| format!("Failed to delete chat message: {e}"))?;
        Ok(())
    })
}
