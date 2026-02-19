// Google OAuth Commands (desktop-safe)
// Uses system browser + localhost loopback callback + PKCE.
// Stores OAuth session in OS keychain instead of localStorage.

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use keyring::Entry;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::command;
use url::Url;
use uuid::Uuid;

const SERVICE_NAME: &str = "com.becomeauthor.app";
const TOKENS_ACCOUNT: &str = "google-oauth-tokens";
const USER_ACCOUNT: &str = "google-oauth-user";
const CALLBACK_TIMEOUT_SECS: u64 = 180;

const GOOGLE_AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_ENDPOINT: &str = "https://oauth2.googleapis.com/revoke";
const GOOGLE_USERINFO_ENDPOINT: &str = "https://www.googleapis.com/oauth2/v2/userinfo";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GoogleUser {
    pub id: String,
    pub email: String,
    pub name: String,
    pub picture: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GoogleOAuthTokens {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: i64,
    scope: String,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: i64,
    #[serde(default)]
    refresh_token: Option<String>,
    #[serde(default)]
    scope: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UserInfoResponse {
    id: String,
    email: String,
    #[serde(default)]
    name: String,
    #[serde(default)]
    picture: String,
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn keyring_entry(account: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, account)
        .map_err(|e| format!("Failed to create keyring entry for {account}: {e}"))
}

fn store_json<T: Serialize>(account: &str, data: &T) -> Result<(), String> {
    let entry = keyring_entry(account)?;
    let payload = serde_json::to_string(data)
        .map_err(|e| format!("Failed to serialize keychain payload: {e}"))?;
    entry
        .set_password(&payload)
        .map_err(|e| format!("Failed to store keychain payload: {e}"))
}

fn load_json<T: for<'de> Deserialize<'de>>(account: &str) -> Result<Option<T>, String> {
    let entry = keyring_entry(account)?;
    match entry.get_password() {
        Ok(payload) => {
            let parsed = serde_json::from_str::<T>(&payload)
                .map_err(|e| format!("Failed to parse keychain payload: {e}"))?;
            Ok(Some(parsed))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read keychain payload: {e}")),
    }
}

fn delete_entry(account: &str) -> Result<(), String> {
    let entry = keyring_entry(account)?;
    match entry.delete_password() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete keychain payload: {e}")),
    }
}

fn build_code_verifier() -> String {
    // PKCE verifier must be 43-128 chars, charset [A-Z / a-z / 0-9 / -._~].
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn build_code_challenge(code_verifier: &str) -> String {
    let digest = Sha256::digest(code_verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn wait_for_google_callback(listener: TcpListener) -> Result<HashMap<String, String>, String> {
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to configure callback listener: {e}"))?;

    let started = std::time::Instant::now();

    loop {
        if started.elapsed() > Duration::from_secs(CALLBACK_TIMEOUT_SECS) {
            return Err("Timed out waiting for Google OAuth callback".to_string());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buffer = [0_u8; 8192];
                let bytes_read = stream
                    .read(&mut buffer)
                    .map_err(|e| format!("Failed to read callback request: {e}"))?;

                let request = String::from_utf8_lossy(&buffer[..bytes_read]);
                let request_line = request
                    .lines()
                    .next()
                    .ok_or_else(|| "Invalid callback request".to_string())?;

                let path = request_line
                    .split_whitespace()
                    .nth(1)
                    .ok_or_else(|| "Failed to parse callback path".to_string())?;

                let callback_url = Url::parse(&format!("http://localhost{path}"))
                    .map_err(|e| format!("Failed to parse callback URL: {e}"))?;

                let params = callback_url
                    .query_pairs()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect::<HashMap<_, _>>();

                let html = "<html><body><h3>Authentication complete.</h3><p>You can close this window and return to the app.</p></body></html>";
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    html.len(),
                    html
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();

                return Ok(params);
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(e) => return Err(format!("Failed waiting for callback: {e}")),
        }
    }
}

async fn exchange_code_for_tokens(
    client: &Client,
    client_id: &str,
    code: &str,
    redirect_uri: &str,
    code_verifier: &str,
) -> Result<GoogleOAuthTokens, String> {
    let response = client
        .post(GOOGLE_TOKEN_ENDPOINT)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("client_id", client_id),
            ("code", code),
            ("code_verifier", code_verifier),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {e}"))?;

    if !response.status().is_success() {
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown token exchange error".to_string());
        return Err(format!("Google token exchange failed: {body}"));
    }

    let payload: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token exchange response: {e}"))?;

    Ok(GoogleOAuthTokens {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_at: now_unix() + payload.expires_in,
        scope: payload.scope.unwrap_or_default(),
    })
}

async fn refresh_access_token(
    client: &Client,
    client_id: &str,
    tokens: &GoogleOAuthTokens,
) -> Result<GoogleOAuthTokens, String> {
    let refresh_token = tokens
        .refresh_token
        .as_deref()
        .ok_or_else(|| "No refresh token available".to_string())?;

    let response = client
        .post(GOOGLE_TOKEN_ENDPOINT)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("client_id", client_id),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {e}"))?;

    if !response.status().is_success() {
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown token refresh error".to_string());
        return Err(format!("Google token refresh failed: {body}"));
    }

    let payload: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token refresh response: {e}"))?;

    Ok(GoogleOAuthTokens {
        access_token: payload.access_token,
        refresh_token: Some(refresh_token.to_string()),
        expires_at: now_unix() + payload.expires_in,
        scope: payload.scope.unwrap_or_else(|| tokens.scope.clone()),
    })
}

async fn fetch_user_info(client: &Client, access_token: &str) -> Result<GoogleUser, String> {
    let response = client
        .get(GOOGLE_USERINFO_ENDPOINT)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("User info request failed: {e}"))?;

    if !response.status().is_success() {
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown user info error".to_string());
        return Err(format!("Failed to fetch Google user info: {body}"));
    }

    let payload: UserInfoResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user info response: {e}"))?;

    Ok(GoogleUser {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
    })
}

#[command]
pub async fn google_oauth_connect(
    client_id: String,
    scopes: Vec<String>,
) -> Result<GoogleUser, String> {
    if client_id.trim().is_empty() {
        return Err("Google client_id is required".to_string());
    }

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind OAuth callback listener: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to read callback listener port: {e}"))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{port}/oauth2/callback");
    let code_verifier = build_code_verifier();
    let code_challenge = build_code_challenge(&code_verifier);
    let state = Uuid::new_v4().simple().to_string();

    let scopes_joined = if scopes.is_empty() {
        [
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive.metadata.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ]
        .join(" ")
    } else {
        scopes.join(" ")
    };

    let mut auth_url =
        Url::parse(GOOGLE_AUTH_ENDPOINT).map_err(|e| format!("Failed to build OAuth URL: {e}"))?;
    auth_url
        .query_pairs_mut()
        .append_pair("client_id", &client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", &scopes_joined)
        .append_pair("code_challenge", &code_challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent")
        .append_pair("state", &state);

    open::that(auth_url.as_str())
        .map_err(|e| format!("Failed to open browser for Google OAuth: {e}"))?;

    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let result = wait_for_google_callback(listener);
        let _ = tx.send(result);
    });

    let callback_params = rx
        .recv_timeout(Duration::from_secs(CALLBACK_TIMEOUT_SECS + 5))
        .map_err(|_| "Timed out waiting for Google OAuth callback".to_string())??;

    if let Some(err) = callback_params.get("error") {
        return Err(format!("Google OAuth denied or failed: {err}"));
    }

    let returned_state = callback_params
        .get("state")
        .ok_or_else(|| "Missing OAuth state".to_string())?;
    if returned_state != &state {
        return Err("OAuth state mismatch".to_string());
    }

    let code = callback_params
        .get("code")
        .ok_or_else(|| "Missing authorization code".to_string())?;

    let client = Client::new();
    let tokens =
        exchange_code_for_tokens(&client, &client_id, code, &redirect_uri, &code_verifier).await?;
    let user = fetch_user_info(&client, &tokens.access_token).await?;

    store_json(TOKENS_ACCOUNT, &tokens)?;
    store_json(USER_ACCOUNT, &user)?;

    Ok(user)
}

#[command]
pub async fn google_oauth_get_access_token(client_id: String) -> Result<Option<String>, String> {
    if client_id.trim().is_empty() {
        return Err("Google client_id is required".to_string());
    }

    let Some(tokens) = load_json::<GoogleOAuthTokens>(TOKENS_ACCOUNT)? else {
        return Ok(None);
    };

    // Refresh 5 minutes before expiry.
    if tokens.expires_at > now_unix() + 300 {
        return Ok(Some(tokens.access_token));
    }

    let client = Client::new();
    let refreshed = match refresh_access_token(&client, &client_id, &tokens).await {
        Ok(t) => t,
        Err(err) => {
            let _ = delete_entry(TOKENS_ACCOUNT);
            let _ = delete_entry(USER_ACCOUNT);
            return Err(err);
        }
    };

    store_json(TOKENS_ACCOUNT, &refreshed)?;
    Ok(Some(refreshed.access_token))
}

#[command]
pub fn google_oauth_get_user() -> Result<Option<GoogleUser>, String> {
    load_json(USER_ACCOUNT)
}

#[command]
pub async fn google_oauth_sign_out() -> Result<(), String> {
    if let Some(tokens) = load_json::<GoogleOAuthTokens>(TOKENS_ACCOUNT)? {
        let client = Client::new();
        let _ = client
            .post(GOOGLE_REVOKE_ENDPOINT)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&[("token", tokens.access_token)])
            .send()
            .await;
    }

    delete_entry(TOKENS_ACCOUNT)?;
    delete_entry(USER_ACCOUNT)?;
    Ok(())
}
