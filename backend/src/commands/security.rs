// Secure Storage Commands
// Provides OS-level encrypted storage for sensitive data like API keys
// Uses platform keychains: macOS Keychain, Windows Credential Manager, Linux Secret Service

use keyring::Entry;
use tauri::command;

const SERVICE_NAME: &str = "com.becomeauthor.app";

fn keychain_account(provider: &str, connection_id: &str) -> String {
    format!("api-key-{}-{}", provider, connection_id)
}

/// Store an API key in the OS keychain
///
/// # Arguments
/// * `provider` - The AI provider name (e.g., "openai", "anthropic", "google")
/// * `connection_id` - The unique AI connection ID
/// * `key` - The API key to store (will be encrypted by OS)
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error message on failure
#[command]
pub fn store_api_key(provider: String, connection_id: String, key: String) -> Result<(), String> {
    log::info!("Storing API key for provider: {}", provider);

    // Validate inputs
    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }
    if connection_id.is_empty() {
        return Err("Connection ID cannot be empty".to_string());
    }

    if key.is_empty() {
        return Err("API key cannot be empty".to_string());
    }

    // Create keyring entry
    // This creates an account in OS keychain:
    // - Service: "com.becomeauthor.app"
    // - Account: "api-key-<provider>-<connection_id>"
    let account = keychain_account(&provider, &connection_id);
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    // Store password (API key)
    entry
        .set_password(&key)
        .map_err(|e| format!("Failed to store API key: {}", e))?;

    log::info!("Successfully stored API key for provider: {}", provider);
    Ok(())
}

/// Retrieve an API key from the OS keychain
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

    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }
    if connection_id.is_empty() {
        return Err("Connection ID cannot be empty".to_string());
    }

    let account = keychain_account(&provider, &connection_id);
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    // Get password (API key)
    match entry.get_password() {
        Ok(key) => {
            log::info!("Successfully retrieved API key for provider: {}", provider);
            Ok(Some(key))
        }
        Err(keyring::Error::NoEntry) => {
            log::info!("No API key found for provider: {}", provider);
            Ok(None)
        }
        Err(e) => {
            log::error!("Error retrieving API key: {}", e);
            Err(format!("Failed to retrieve API key: {}", e))
        }
    }
}

/// Delete an API key from the OS keychain
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

    if provider.is_empty() {
        return Err("Provider name cannot be empty".to_string());
    }
    if connection_id.is_empty() {
        return Err("Connection ID cannot be empty".to_string());
    }

    let account = keychain_account(&provider, &connection_id);
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    // Delete password
    match entry.delete_password() {
        Ok(_) => {
            log::info!("Successfully deleted API key for provider: {}", provider);
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            log::info!("No API key to delete for provider: {}", provider);
            Ok(()) // Not an error if it doesn't exist
        }
        Err(e) => {
            log::error!("Error deleting API key: {}", e);
            Err(format!("Failed to delete API key: {}", e))
        }
    }
}

/// List all stored API key providers (without revealing the actual keys)
///
/// # Returns
/// * `Ok(Vec<String>)` with provider names that have keys stored
/// * `Err(String)` on error
#[command]
pub fn list_api_key_providers() -> Result<Vec<String>, String> {
    log::info!("Listing API key providers");

    // Known provider names to check
    let known_providers = vec!["openai", "anthropic", "google", "openrouter"];

    let mut stored_providers = Vec::new();

    for provider in known_providers {
        let account = format!("api-key-{}", provider);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &account) {
            if entry.get_password().is_ok() {
                stored_providers.push(provider.to_string());
            }
        }
    }

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

    // Integration tests for actual keychain operations
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
