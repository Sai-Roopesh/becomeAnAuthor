// Secure credential commands
// Stores encrypted API keys in SQLite and keeps non-secret account metadata in SQLite.

use crate::storage::sqlite::{
    delete_secure_account, delete_secure_secret, get_secure_secret, list_secure_account_providers,
    open_app_db, upsert_secure_account, upsert_secure_secret,
};
use crate::utils::get_app_dir;
use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use chrono::Utc;
use rand::RngCore;
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use tauri::command;

pub(crate) const API_KEY_NAMESPACE: &str = "api_key";
const MASTER_KEY_FILE: &str = "api_key_master.key";
const KEY_LENGTH: usize = 32;
const NONCE_LENGTH: usize = 12;

fn master_key_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let meta_dir = app_dir.join(".meta");
    fs::create_dir_all(&meta_dir)
        .map_err(|e| format!("Failed to create secure storage directory: {e}"))?;
    Ok(meta_dir.join(MASTER_KEY_FILE))
}

fn apply_master_key_permissions(path: &PathBuf) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|e| format!("Failed to set master key permissions: {e}"))?;
    }

    // Use path to satisfy compiler when not on unix
    let _ = path;

    Ok(())
}

fn load_or_create_master_key() -> Result<[u8; KEY_LENGTH], String> {
    let path = master_key_path()?;

    if path.exists() {
        let bytes = fs::read(&path).map_err(|e| format!("Failed to read master key file: {e}"))?;
        if bytes.len() != KEY_LENGTH {
            return Err("Invalid master key length".to_string());
        }

        let mut key = [0u8; KEY_LENGTH];
        key.copy_from_slice(&bytes);
        return Ok(key);
    }

    let mut key = [0u8; KEY_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut key);
    fs::write(&path, key).map_err(|e| format!("Failed to create master key file: {e}"))?;
    apply_master_key_permissions(&path)?;
    Ok(key)
}

fn encrypt_secret(plaintext: &str) -> Result<(Vec<u8>, Vec<u8>), String> {
    let key = load_or_create_master_key()?;
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Failed to initialize cipher: {e}"))?;

    let mut nonce = [0u8; NONCE_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut nonce);

    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext.as_bytes())
        .map_err(|_| "Failed to encrypt secret".to_string())?;

    Ok((nonce.to_vec(), ciphertext))
}

fn decrypt_secret(nonce: &[u8], ciphertext: &[u8]) -> Result<String, String> {
    if nonce.len() != NONCE_LENGTH {
        return Err("Invalid secret nonce length".to_string());
    }

    let key = load_or_create_master_key()?;
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Failed to initialize cipher: {e}"))?;

    let plaintext = cipher
        .decrypt(Nonce::from_slice(nonce), ciphertext)
        .map_err(|_| "Failed to decrypt secret".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("Failed to decode decrypted secret: {e}"))
}

fn validate_account_inputs(
    provider: &str,
    connection_id: &str,
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

pub(crate) fn store_secret_for_account(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
    secret: &str,
) -> Result<(), String> {
    let (provider, connection_id) = validate_account_inputs(provider, connection_id)?;
    let normalized_namespace = namespace.trim().to_string();
    if normalized_namespace.is_empty() {
        return Err("Namespace cannot be empty".to_string());
    }
    let normalized_secret = secret.trim();
    if normalized_secret.is_empty() {
        return Err("Secret cannot be empty".to_string());
    }

    let (nonce, ciphertext) = encrypt_secret(normalized_secret)?;
    let now = Utc::now().timestamp_millis();

    upsert_secure_account(conn, &normalized_namespace, &provider, &connection_id, now)?;
    upsert_secure_secret(
        conn,
        &normalized_namespace,
        &provider,
        &connection_id,
        &nonce,
        &ciphertext,
        now,
    )?;

    Ok(())
}

pub(crate) fn get_secret_for_account(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
) -> Result<Option<String>, String> {
    let (provider, connection_id) = validate_account_inputs(provider, connection_id)?;
    let normalized_namespace = namespace.trim().to_string();
    if normalized_namespace.is_empty() {
        return Err("Namespace cannot be empty".to_string());
    }
    let secret = get_secure_secret(conn, &normalized_namespace, &provider, &connection_id)?;
    let Some((nonce, ciphertext)) = secret else {
        return Ok(None);
    };

    let plaintext = decrypt_secret(&nonce, &ciphertext)?;
    if plaintext.trim().is_empty() {
        Ok(None)
    } else {
        Ok(Some(plaintext))
    }
}

pub(crate) fn has_secret_for_account(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
) -> Result<bool, String> {
    Ok(
        get_secret_for_account(conn, namespace, provider, connection_id)?
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false),
    )
}

pub(crate) fn delete_secret_for_account(
    conn: &Connection,
    namespace: &str,
    provider: &str,
    connection_id: &str,
) -> Result<(), String> {
    let (provider, connection_id) = validate_account_inputs(provider, connection_id)?;
    let normalized_namespace = namespace.trim().to_string();
    if normalized_namespace.is_empty() {
        return Err("Namespace cannot be empty".to_string());
    }
    delete_secure_secret(conn, &normalized_namespace, &provider, &connection_id)?;
    delete_secure_account(conn, &normalized_namespace, &provider, &connection_id)?;
    Ok(())
}

pub(crate) fn store_api_key_for_account(
    conn: &Connection,
    provider: &str,
    connection_id: &str,
    key: &str,
) -> Result<(), String> {
    store_secret_for_account(conn, API_KEY_NAMESPACE, provider, connection_id, key)
}

pub(crate) fn get_api_key_for_account(
    conn: &Connection,
    provider: &str,
    connection_id: &str,
) -> Result<Option<String>, String> {
    get_secret_for_account(conn, API_KEY_NAMESPACE, provider, connection_id)
}

pub(crate) fn has_api_key_for_account(
    conn: &Connection,
    provider: &str,
    connection_id: &str,
) -> Result<bool, String> {
    has_secret_for_account(conn, API_KEY_NAMESPACE, provider, connection_id)
}

pub(crate) fn delete_api_key_for_account(
    conn: &Connection,
    provider: &str,
    connection_id: &str,
) -> Result<(), String> {
    delete_secret_for_account(conn, API_KEY_NAMESPACE, provider, connection_id)
}

/// Store an encrypted API key in SQLite.
#[command]
pub fn store_api_key(provider: String, connection_id: String, key: String) -> Result<(), String> {
    let conn = open_app_db()?;
    store_api_key_for_account(&conn, &provider, &connection_id, &key)
}

/// Retrieve and decrypt an API key from SQLite.
#[command]
pub fn get_api_key(provider: String, connection_id: String) -> Result<Option<String>, String> {
    let conn = open_app_db()?;
    get_api_key_for_account(&conn, &provider, &connection_id)
}

/// Check whether an API key exists for a provider/connection.
#[command]
pub fn has_api_key(provider: String, connection_id: String) -> Result<bool, String> {
    let conn = open_app_db()?;
    has_api_key_for_account(&conn, &provider, &connection_id)
}

/// Delete an API key from encrypted SQLite storage.
#[command]
pub fn delete_api_key(provider: String, connection_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    delete_api_key_for_account(&conn, &provider, &connection_id)
}

/// List all providers that have at least one stored API key.
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
        assert!(has_api_key("".to_string(), "conn-1".to_string()).is_err());
        assert!(delete_api_key("".to_string(), "conn-1".to_string()).is_err());
    }

    #[test]
    fn test_validate_connection_id() {
        assert!(store_api_key("test".to_string(), "".to_string(), "test-key".to_string()).is_err());
        assert!(get_api_key("test".to_string(), "".to_string()).is_err());
        assert!(has_api_key("test".to_string(), "".to_string()).is_err());
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
