use crate::commands::security::{
    delete_api_key_for_account, has_api_key_for_account, store_api_key_for_account,
};
use crate::storage::{
    app_pref_delete as db_app_pref_delete, app_pref_get as db_app_pref_get,
    app_pref_get_many as db_app_pref_get_many, app_pref_set as db_app_pref_set,
    clear_model_discovery_cache as db_clear_model_discovery_cache,
    delete_ai_connection as delete_ai_connection_row, get_ai_connection,
    get_model_discovery_cache as db_get_model_discovery_cache,
    list_ai_connections as list_ai_connection_rows, open_app_db,
    save_ai_connection as save_ai_connection_row,
    set_model_discovery_cache as db_set_model_discovery_cache, AIConnectionRecord,
    ModelDiscoveryCacheRecord,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedAIConnection {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub custom_endpoint: Option<String>,
    pub enabled: bool,
    pub models: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub has_stored_api_key: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAIConnectionInput {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub custom_endpoint: Option<String>,
    pub enabled: bool,
    pub models: Option<Vec<String>>,
    pub api_key: Option<String>,
}

fn ensure_non_empty(label: &str, value: &str) -> Result<String, String> {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        return Err(format!("{} cannot be empty", label));
    }
    Ok(normalized)
}

fn normalize_models(models: Option<Vec<String>>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();
    for model in models.unwrap_or_default() {
        let candidate = model.trim().to_string();
        if candidate.is_empty() {
            continue;
        }
        if seen.insert(candidate.clone()) {
            normalized.push(candidate);
        }
    }
    normalized
}

fn to_persisted_connection(
    row: AIConnectionRecord,
    has_stored_api_key: bool,
) -> PersistedAIConnection {
    PersistedAIConnection {
        id: row.id,
        name: row.name,
        provider: row.provider,
        custom_endpoint: row.custom_endpoint,
        enabled: row.enabled,
        models: row.models,
        created_at: row.created_at,
        updated_at: row.updated_at,
        has_stored_api_key,
    }
}

#[tauri::command]
pub fn app_pref_get(key: String) -> Result<Option<String>, String> {
    let normalized_key = ensure_non_empty("Preference key", &key)?;
    let conn = open_app_db()?;
    db_app_pref_get(&conn, &normalized_key)
}

#[tauri::command]
pub fn app_pref_get_many(keys: Vec<String>) -> Result<HashMap<String, String>, String> {
    let mut normalized = Vec::new();
    for key in keys {
        let candidate = key.trim().to_string();
        if candidate.is_empty() {
            continue;
        }
        normalized.push(candidate);
    }

    if normalized.is_empty() {
        return Ok(HashMap::new());
    }

    let conn = open_app_db()?;
    let rows = db_app_pref_get_many(&conn, &normalized)?;
    Ok(rows.into_iter().collect::<HashMap<_, _>>())
}

#[tauri::command]
pub fn app_pref_set(key: String, value_json: String) -> Result<(), String> {
    let normalized_key = ensure_non_empty("Preference key", &key)?;
    let normalized_value = value_json.trim().to_string();
    if normalized_value.is_empty() {
        return Err("Preference value_json cannot be empty".to_string());
    }

    let conn = open_app_db()?;
    db_app_pref_set(
        &conn,
        &normalized_key,
        &normalized_value,
        Utc::now().timestamp_millis(),
    )
}

#[tauri::command]
pub fn app_pref_delete(key: String) -> Result<(), String> {
    let normalized_key = ensure_non_empty("Preference key", &key)?;
    let conn = open_app_db()?;
    db_app_pref_delete(&conn, &normalized_key)
}

#[tauri::command]
pub fn list_ai_connections() -> Result<Vec<PersistedAIConnection>, String> {
    let conn = open_app_db()?;
    let rows = list_ai_connection_rows(&conn)?;
    let mut connections = Vec::new();
    for row in rows {
        let has_stored_api_key = has_api_key_for_account(&conn, &row.provider, &row.id)?;
        connections.push(to_persisted_connection(row, has_stored_api_key));
    }
    Ok(connections)
}

#[tauri::command]
pub fn save_ai_connection(input: SaveAIConnectionInput) -> Result<PersistedAIConnection, String> {
    let id = ensure_non_empty("Connection id", &input.id)?;
    let name = ensure_non_empty("Connection name", &input.name)?;
    let provider = ensure_non_empty("Connection provider", &input.provider)?;
    let custom_endpoint = input
        .custom_endpoint
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let models = normalize_models(input.models);

    let conn = open_app_db()?;
    let existing = get_ai_connection(&conn, &id)?;
    let created_at = existing
        .as_ref()
        .map(|row| row.created_at)
        .unwrap_or_else(|| Utc::now().timestamp_millis());
    let now = Utc::now().timestamp_millis();

    let row = AIConnectionRecord {
        id: id.clone(),
        name,
        provider: provider.clone(),
        custom_endpoint,
        enabled: input.enabled,
        models,
        created_at,
        updated_at: now,
    };

    let persisted = save_ai_connection_row(&conn, &row)?;

    if let Some(previous) = existing {
        if previous.provider != provider {
            delete_api_key_for_account(&conn, &previous.provider, &id)?;
        }
    }

    if let Some(api_key_value) = input.api_key {
        let normalized = api_key_value.trim();
        if normalized.is_empty() {
            delete_api_key_for_account(&conn, &provider, &id)?;
        } else {
            store_api_key_for_account(&conn, &provider, &id, normalized)?;
        }
    }

    let has_stored_api_key = has_api_key_for_account(&conn, &provider, &id)?;
    Ok(to_persisted_connection(persisted, has_stored_api_key))
}

#[tauri::command]
pub fn delete_ai_connection(id: String) -> Result<(), String> {
    let normalized_id = ensure_non_empty("Connection id", &id)?;
    let conn = open_app_db()?;
    let existing = get_ai_connection(&conn, &normalized_id)?;
    delete_ai_connection_row(&conn, &normalized_id)?;

    if let Some(connection) = existing {
        delete_api_key_for_account(&conn, &connection.provider, &normalized_id)?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_model_discovery_cache(
    provider: String,
    endpoint: String,
) -> Result<Option<ModelDiscoveryCacheRecord>, String> {
    let provider = ensure_non_empty("Provider", &provider)?;
    let endpoint = ensure_non_empty("Endpoint", &endpoint)?;
    let conn = open_app_db()?;
    db_get_model_discovery_cache(&conn, &provider, &endpoint)
}

#[tauri::command]
pub fn set_model_discovery_cache(
    provider: String,
    endpoint: String,
    payload_json: String,
    ttl_ms: i64,
) -> Result<(), String> {
    let provider = ensure_non_empty("Provider", &provider)?;
    let endpoint = ensure_non_empty("Endpoint", &endpoint)?;
    let payload_json = payload_json.trim().to_string();
    if payload_json.is_empty() {
        return Err("payload_json cannot be empty".to_string());
    }

    let now = Utc::now().timestamp_millis();
    let ttl = ttl_ms.max(0);
    let row = ModelDiscoveryCacheRecord {
        provider,
        endpoint,
        payload_json,
        cached_at: now,
        expires_at: now.saturating_add(ttl),
    };

    let conn = open_app_db()?;
    db_set_model_discovery_cache(&conn, &row)
}

#[tauri::command]
pub fn clear_model_discovery_cache(provider: Option<String>) -> Result<(), String> {
    let normalized_provider = provider
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let conn = open_app_db()?;
    db_clear_model_discovery_cache(&conn, normalized_provider.as_deref())
}
