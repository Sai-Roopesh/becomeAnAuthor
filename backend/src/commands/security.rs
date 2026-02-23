// Secure Storage Commands
// Stores sensitive data in local app-scoped files.

use crate::utils::get_app_dir;
use std::collections::{BTreeSet, HashMap};
use std::fs;
use std::path::PathBuf;
use tauri::command;

fn storage_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let meta_dir = app_dir.join(".meta");
    fs::create_dir_all(&meta_dir).map_err(|e| format!("Failed to create .meta directory: {e}"))?;
    Ok(meta_dir.join("api_keys.json"))
}

fn account_key(provider: &str, connection_id: &str) -> String {
    format!("{provider}::{connection_id}")
}

fn read_api_key_store() -> Result<HashMap<String, String>, String> {
    let path = storage_path()?;
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read API key storage file: {e}"))?;
    serde_json::from_str::<HashMap<String, String>>(&content)
        .map_err(|e| format!("Failed to parse API key storage file: {e}"))
}

fn write_api_key_store(store: &HashMap<String, String>) -> Result<(), String> {
    let path = storage_path()?;
    let json = serde_json::to_string_pretty(store)
        .map_err(|e| format!("Failed to serialize API key store: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write API key store: {e}"))
}

/// Store an API key in local app storage
///
/// # Arguments
/// * `provider` - The AI provider name (e.g., "openai", "anthropic", "google")
/// * `connection_id` - The unique AI connection ID
/// * `key` - The API key to store
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error message on failure
#[command]
pub fn store_api_key(provider: String, connection_id: String, key: String) -> Result<(), String> {
    log::info!("Storing API key for provider: {}", provider);

    // Validate inputs
    let provider = provider.trim().to_string();
    let connection_id = connection_id.trim().to_string();
    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }
    if connection_id.is_empty() {
        return Err("Connection ID cannot be empty".to_string());
    }

    if key.is_empty() {
        return Err("API key cannot be empty".to_string());
    }

    let mut store = read_api_key_store()?;
    store.insert(account_key(&provider, &connection_id), key);
    write_api_key_store(&store)?;

    log::info!("Successfully stored API key for provider: {}", provider);
    Ok(())
}

/// Retrieve an API key from local app storage
///
/// # Arguments
/// * `provider` - The AI provider name
/// * `connection_id` - The unique AI connection ID
///
/// # Returns
/// * `Ok(Some(String))` with the API key if found
/// * `Ok(None)` if no key is stored for this provider
/// * `Err(String)` on error
#[command]
pub fn get_api_key(provider: String, connection_id: String) -> Result<Option<String>, String> {
    log::info!("Retrieving API key for provider: {}", provider);

    let provider = provider.trim().to_string();
    let connection_id = connection_id.trim().to_string();
    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }
    if connection_id.is_empty() {
        return Err("Connection ID cannot be empty".to_string());
    }

    let store = read_api_key_store()?;
    let key = store.get(&account_key(&provider, &connection_id)).cloned();
    if key.is_some() {
        log::info!("Successfully retrieved API key for provider: {}", provider);
    } else {
        log::info!("No API key found for provider: {}", provider);
    }
    Ok(key)
}

/// Delete an API key from local app storage
///
/// # Arguments
/// * `provider` - The AI provider name
/// * `connection_id` - The unique AI connection ID
///
/// # Returns
/// * `Ok(())` on success (even if key didn't exist)
/// * `Err(String)` on error
#[command]
pub fn delete_api_key(provider: String, connection_id: String) -> Result<(), String> {
    log::info!("Deleting API key for provider: {}", provider);

    let provider = provider.trim().to_string();
    let connection_id = connection_id.trim().to_string();
    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }
    if connection_id.is_empty() {
        return Err("Connection ID cannot be empty".to_string());
    }

    let mut store = read_api_key_store()?;
    if store
        .remove(&account_key(&provider, &connection_id))
        .is_some()
    {
        write_api_key_store(&store)?;
        log::info!("Successfully deleted API key for provider: {}", provider);
    } else {
        log::info!("No API key to delete for provider: {}", provider);
    }
    Ok(())
}

/// List all stored API key providers (without revealing the actual keys)
///
/// # Returns
/// * `Ok(Vec<String>)` with provider names that have keys stored
/// * `Err(String)` on error
#[command]
pub fn list_api_key_providers() -> Result<Vec<String>, String> {
    log::info!("Listing API key providers");

    let store = read_api_key_store()?;
    let mut providers = BTreeSet::new();
    for account in store.keys() {
        if let Some((provider, _)) = account.split_once("::") {
            if !provider.trim().is_empty() {
                providers.insert(provider.to_string());
            }
        }
    }
    let stored_providers = providers.into_iter().collect::<Vec<_>>();
    log::info!(
        "Found {} providers with stored keys",
        stored_providers.len()
    );
    Ok(stored_providers)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_provider_name() {
        // Empty provider should error
        assert!(store_api_key("".to_string(), "conn-1".to_string(), "test-key".to_string()).is_err());
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
        // Empty key should error
        assert!(store_api_key("test".to_string(), "conn-1".to_string(), "".to_string()).is_err());
    }

    // Integration tests for actual storage operations
    #[test]
    #[ignore] // Run with: cargo test -- --ignored
    fn test_store_and_retrieve() {
        let provider = "test-provider".to_string();
        let connection_id = "test-connection".to_string();
        let api_key = "test-key-12345".to_string();

        // Store
        assert!(store_api_key(provider.clone(), connection_id.clone(), api_key.clone()).is_ok());

        // Retrieve
        let retrieved = get_api_key(provider.clone(), connection_id.clone()).unwrap();
        assert_eq!(retrieved, Some(api_key));

        // Cleanup
        assert!(delete_api_key(provider, connection_id).is_ok());
    }
}
