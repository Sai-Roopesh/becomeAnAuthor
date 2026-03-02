// Collaboration commands for Yjs state persistence in SQLite.

use crate::storage::{
    append_yjs_update_log, delete_all_yjs_update_logs, delete_yjs_snapshot,
    delete_yjs_update_log_up_to_seq, get_yjs_snapshot, has_yjs_snapshot, list_yjs_update_log_since,
    open_app_db, save_yjs_snapshot, YjsSnapshotRecord, YjsUpdateLogRecord,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YjsState {
    pub scene_id: String,
    pub project_id: String,
    pub update: Vec<u8>,
    pub saved_at: i64,
}

const YJS_UPDATE_LOG_MAX_ROWS: usize = 200;
const YJS_UPDATE_LOG_KEEP_ROWS: usize = 100;

fn normalize_state_inputs(
    project_path: String,
    scene_id: String,
) -> Result<(String, String), String> {
    let normalized_project_path = project_path.trim().to_string();
    let normalized_scene_id = scene_id.trim().to_string();
    if normalized_project_path.is_empty() {
        return Err("Project path cannot be empty".to_string());
    }
    if normalized_scene_id.is_empty() {
        return Err("Scene ID cannot be empty".to_string());
    }
    Ok((normalized_project_path, normalized_scene_id))
}

fn to_state(project_path: String, scene_id: String, update: Vec<u8>, saved_at: i64) -> YjsState {
    YjsState {
        scene_id,
        project_id: project_path,
        update,
        saved_at,
    }
}

fn compact_yjs_update_log(
    conn: &rusqlite::Connection,
    project_path: &str,
    scene_id: &str,
) -> Result<(), String> {
    let rows: Vec<YjsUpdateLogRecord> =
        list_yjs_update_log_since(conn, project_path, scene_id, None)?;
    if rows.len() <= YJS_UPDATE_LOG_MAX_ROWS {
        return Ok(());
    }
    let prune_index = rows.len().saturating_sub(YJS_UPDATE_LOG_KEEP_ROWS);
    if let Some(cutoff) = rows.get(prune_index) {
        delete_yjs_update_log_up_to_seq(conn, project_path, scene_id, cutoff.seq)?;
    }
    Ok(())
}

#[tauri::command]
pub fn save_yjs_state(
    project_path: String,
    scene_id: String,
    update: Vec<u8>,
) -> Result<(), String> {
    let (normalized_project_path, normalized_scene_id) =
        normalize_state_inputs(project_path, scene_id)?;

    let conn = open_app_db()?;
    let now = Utc::now().timestamp_millis();
    let row = YjsSnapshotRecord {
        project_path: normalized_project_path.clone(),
        scene_id: normalized_scene_id.clone(),
        update_blob: update.clone(),
        saved_at: now,
    };
    save_yjs_snapshot(&conn, &row)?;
    append_yjs_update_log(
        &conn,
        &normalized_project_path,
        &normalized_scene_id,
        &update,
        now,
    )?;
    compact_yjs_update_log(&conn, &normalized_project_path, &normalized_scene_id)?;
    Ok(())
}

#[tauri::command]
pub fn load_yjs_state(project_path: String, scene_id: String) -> Result<Option<YjsState>, String> {
    let (normalized_project_path, normalized_scene_id) =
        normalize_state_inputs(project_path, scene_id)?;

    let conn = open_app_db()?;
    let snapshot = get_yjs_snapshot(&conn, &normalized_project_path, &normalized_scene_id)?;
    if let Some(state) = snapshot {
        return Ok(Some(to_state(
            state.project_path,
            state.scene_id,
            state.update_blob,
            state.saved_at,
        )));
    }

    let logs =
        list_yjs_update_log_since(&conn, &normalized_project_path, &normalized_scene_id, None)?;
    let latest = logs.last();
    Ok(latest.map(|state| {
        to_state(
            state.project_path.clone(),
            state.scene_id.clone(),
            state.update_blob.clone(),
            state.saved_at,
        )
    }))
}

#[tauri::command]
pub fn has_yjs_state(project_path: String, scene_id: String) -> Result<bool, String> {
    let (normalized_project_path, normalized_scene_id) =
        normalize_state_inputs(project_path, scene_id)?;

    let conn = open_app_db()?;
    has_yjs_snapshot(&conn, &normalized_project_path, &normalized_scene_id)
}

#[tauri::command]
pub fn delete_yjs_state(project_path: String, scene_id: String) -> Result<(), String> {
    let (normalized_project_path, normalized_scene_id) =
        normalize_state_inputs(project_path, scene_id)?;

    let conn = open_app_db()?;
    delete_yjs_snapshot(&conn, &normalized_project_path, &normalized_scene_id)?;
    delete_all_yjs_update_logs(&conn, &normalized_project_path, &normalized_scene_id)
}
