// Secure credential commands
// Stores sensitive keys in the OS keychain and keeps non-secret account metadata in SQLite.

use crate::storage::sqlite::{
    delete_secure_account, list_secure_account_providers, open_app_db, upsert_secure_account,
};
use chrono::Utc;
use keyring::Entry;
use tauri::command;

const API_KEY_NAMESPACE: &str = "api_key";
const API_KEY_SERVICE: &str = "become-an-author.api-keys";

fn keyring_username(provider: &str, connection_id: &str) -> String {
    format!("{provider}::{connection_id}")
}

fn keyring_entry(provider: &str, connection_id: &str) -> Result<Entry, String> {
    Entry::new(API_KEY_SERVICE, &keyring_username(provider, connection_id))
        .map_err(|e| format!("Failed to initialize keychain entry: {e}"))
}

fn is_keyring_missing_entry(error: &keyring::Error) -> bool {
    matches!(error, keyring::Error::NoEntry)
}

fn validate_account_inputs(
    provider: String,
    connection_id: String,
) -> Result<(String, String), String> {
    let provider = provider.trim().to_string();
    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }

    let connection_id = connection_id.trim().to_string();
    if connection_id.is_empty() {
        return Err("Connection ID cannot be empty".to_string());
    }

    Ok((provider, connection_id))
}

fn record_account(provider: &str, connection_id: &str) -> Result<(), String> {
    let conn = open_app_db()?;
    upsert_secure_account(
        &conn,
        API_KEY_NAMESPACE,
        provider,
        connection_id,
        Utc::now().timestamp_millis(),
    )
}

fn remove_account(provider: &str, connection_id: &str) -> Result<(), String> {
    let conn = open_app_db()?;
    delete_secure_account(&conn, API_KEY_NAMESPACE, provider, connection_id)
}

/// Store an API key in the OS keychain
///
/// # Arguments
/// * `provider` - The AI provider name (e.g., "openai", "anthropic", "google")
/// * `connection_id` - The unique AI connection ID
/// * `key` - The API key to store
#[command]
pub fn store_api_key(provider: String, connection_id: String, key: String) -> Result<(), String> {
    let (provider, connection_id) = validate_account_inputs(provider, connection_id)?;

    let normalized_key = key.trim();
    if normalized_key.is_empty() {
        return Err("API key cannot be empty".to_string());
    }

    keyring_entry(&provider, &connection_id)?
        .set_password(normalized_key)
        .map_err(|e| format!("Failed to store API key in keychain: {e}"))?;

    record_account(&provider, &connection_id)?;
    Ok(())
}

/// Retrieve an API key from the OS keychain
#[command]
pub fn get_api_key(provider: String, connection_id: String) -> Result<Option<String>, String> {
    let (provider, connection_id) = validate_account_inputs(provider, connection_id)?;

    match keyring_entry(&provider, &connection_id)?
        .get_password()
        .map(Some)
    {
        Ok(value) => Ok(value),
        Err(e) if is_keyring_missing_entry(&e) => Ok(None),
        Err(e) => Err(format!("Failed to read API key from keychain: {e}")),
    }
}

/// Delete an API key from the OS keychain
#[command]
pub fn delete_api_key(provider: String, connection_id: String) -> Result<(), String> {
    let (provider, connection_id) = validate_account_inputs(provider, connection_id)?;

    match keyring_entry(&provider, &connection_id)?.delete_credential() {
        Ok(()) => {}
        Err(e) if is_keyring_missing_entry(&e) => {}
        Err(e) => return Err(format!("Failed to delete API key from keychain: {e}")),
    }

    remove_account(&provider, &connection_id)?;
    Ok(())
}

/// List all providers that have at least one stored API key
#[command]
pub fn list_api_key_providers() -> Result<Vec<String>, String> {
    let conn = open_app_db()?;
    list_secure_account_providers(&conn, API_KEY_NAMESPACE)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_provider_name() {
        assert!(
            store_api_key("".to_string(), "conn-1".to_string(), "test-key".to_string()).is_err()
        );
        assert!(get_api_key("".to_string(), "conn-1".to_string()).is_err());
        assert!(delete_api_key("".to_string(), "conn-1".to_string()).is_err());
    }

    #[test]
    fn test_validate_connection_id() {
        assert!(store_api_key("test".to_string(), "".to_string(), "test-key".to_string()).is_err());
        assert!(get_api_key("test".to_string(), "".to_string()).is_err());
        assert!(delete_api_key("test".to_string(), "".to_string()).is_err());
    }

    #[test]
    fn test_validate_api_key() {
        assert!(store_api_key("test".to_string(), "conn-1".to_string(), "".to_string()).is_err());
    }

    #[test]
    #[ignore]
    fn test_store_and_retrieve() {
        let provider = "test-provider".to_string();
        let connection_id = "test-connection".to_string();
        let api_key = "test-key-12345".to_string();

        assert!(store_api_key(provider.clone(), connection_id.clone(), api_key.clone()).is_ok());

        let retrieved = get_api_key(provider.clone(), connection_id.clone()).unwrap();
        assert_eq!(retrieved, Some(api_key));

        assert!(delete_api_key(provider, connection_id).is_ok());
    }
}
