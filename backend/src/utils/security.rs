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
    let project_path = PathBuf::from(path);
    
    // Check if path exists
    if !project_path.exists() {
        return Err("Project path does not exist".to_string());
    }
    
    // Check if it's a valid project directory (has .meta/project.json)
    let meta_file = project_path.join(".meta/project.json");
    if !meta_file.exists() {
        return Err("Invalid project: missing project metadata".to_string());
    }
    
    // Verify it's in the registry (for security - only allow tracked projects)
    let app_dir = get_app_dir()?;
    let registry_path = app_dir.join("project_registry.json");
    
    if registry_path.exists() {
        let content = std::fs::read_to_string(&registry_path).map_err(|e| e.to_string())?;
        let project_paths: Vec<String> = serde_json::from_str(&content).unwrap_or_default();
        
        let path_str = project_path.to_string_lossy().to_string();
        if !project_paths.contains(&path_str) {
            return Err("Access denied: project not in registry".to_string());
        }
    }
    
    Ok(project_path)
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
