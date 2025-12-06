// Security utilities

use std::fs;
use std::path::PathBuf;
use crate::utils::get_app_dir;

/// Maximum file sizes (in bytes)
pub const MAX_SCENE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
pub const MAX_CODEX_SIZE: u64 = 1024 * 1024; // 1MB
pub const MAX_GENERAL_SIZE: u64 = 5 * 1024 * 1024; // 5MB

/// Validates that a project path is within the BecomeAnAuthor directory
/// Prevents path traversal attacks (e.g., ../../etc/passwd)
pub fn validate_project_path(path: &str) -> Result<PathBuf, String> {
    let path_buf = PathBuf::from(path);
    
    // Canonicalize to resolve any .. or symlinks
    let canonical = fs::canonicalize(&path_buf)
        .map_err(|e| format!("Invalid path: {}", e))?;
    
    // Get the app directory
    let app_dir = get_app_dir()?;
    let canonical_app = fs::canonicalize(&app_dir)
        .map_err(|e| format!("Failed to resolve app directory: {}", e))?;
    
    // Ensure the path is within the app directory
    if !canonical.starts_with(&canonical_app) {
        return Err("Access denied: path outside application directory".to_string());
    }
    
    Ok(canonical)
}

/// Checks if a file is within the allowed size limit
pub fn check_file_size(path: &std::path::Path, max_size: u64) -> Result<(), String> {
    if !path.exists() {
        return Ok(()); // File doesn't exist yet, that's fine
    }
    
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    
    if metadata.len() > max_size {
        return Err(format!(
            "File too large: {} bytes (max: {} bytes)",
            metadata.len(),
            max_size
        ));
    }
    
    Ok(())
}
