// Input Validation & Sanitization Utilities
// Prevents path traversal, oversized payloads, and invalid input

use std::path::Path;

// ============================================================================
// Constants
// ============================================================================

/// Maximum length for project titles
pub const MAX_PROJECT_TITLE_LENGTH: usize = 200;

/// Maximum length for scene titles
pub const MAX_SCENE_TITLE_LENGTH: usize = 500;

/// Maximum length for codex entry names
pub const MAX_CODEX_NAME_LENGTH: usize = 300;

/// Maximum file size for scenes (10 MB)
pub const MAX_SCENE_SIZE: u64 = 10 * 1024 * 1024;

/// Maximum JSON payload size (5 MB)
pub const MAX_JSON_SIZE: usize = 5 * 1024 * 1024;

/// Maximum project size (1 GB)
pub const MAX_PROJECT_SIZE: u64 = 1024 * 1024 * 1024;

// ============================================================================
// Path Validation
// ============================================================================

/// Validate that a project title is safe and within limits
/// 
/// # Rules
/// - Not empty
/// - No path separators (/, \)
/// - No special characters (., .., ~, *)
/// - Within length limit
pub fn validate_project_title(title: &str) -> Result<(), String> {
    if title.is_empty() {
        return Err("Project title cannot be empty".to_string());
    }

    if title.len() > MAX_PROJECT_TITLE_LENGTH {
        return Err(format!(
            "Project title too long (max {} characters)",
            MAX_PROJECT_TITLE_LENGTH
        ));
    }

    // Disallow path separators
    if title.contains('/') || title.contains('\\') {
        return Err("Project title cannot contain path separators (/ or \\)".to_string());
    }

    // Disallow dangerous path components
    if title == "." || title == ".." || title.starts_with('.') {
        return Err("Project title cannot start with '.' or be '.' or '..'".to_string());
    }

    // Disallow potentially dangerous characters
    let dangerous_chars = ['*', '?', '<', '>', '|', ':', '"', '\0'];
    if title.chars().any(|c| dangerous_chars.contains(&c)) {
        return Err("Project title contains invalid characters".to_string());
    }

    Ok(())
}

/// Validate scene title
pub fn validate_scene_title(title: &str) -> Result<(), String> {
    if title.is_empty() {
        return Err("Scene title cannot be empty".to_string());
    }

    if title.len() > MAX_SCENE_TITLE_LENGTH {
        return Err(format!(
            "Scene title too long (max {} characters)",
            MAX_SCENE_TITLE_LENGTH
        ));
    }

    // Same rules as project title for path safety
    if title.contains('/') || title.contains('\\') {
        return Err("Scene title cannot contain path separators".to_string());
    }

    Ok(())
}

/// Validate codex entry name
pub fn validate_codex_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Codex entry name cannot be empty".to_string());
    }

    if name.len() > MAX_CODEX_NAME_LENGTH {
        return Err(format!(
            "Codex entry name too long (max {} characters)",
            MAX_CODEX_NAME_LENGTH
        ));
    }

    Ok(())
}

/// Sanitize a path component by removing/replacing dangerous characters
/// 
/// This is used for creating safe filenames from user input.
/// Converts to lowercase, replaces spaces with hyphens, removes special chars.
pub fn sanitize_path_component(input: &str) -> String {
    input
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'a'..='z' | '0'..='9' | '-' | '_' => c,
            ' ' => '-',
            _ => '_',
        })
        .collect::<String>()
        .trim_matches('-')
        .trim_matches('_')
        .to_string()
}

// ============================================================================
// Size Validation
// ============================================================================

/// Validate file size is within limits
pub fn validate_file_size(size: u64, max_size: u64, file_type: &str) -> Result<(), String> {
    if size > max_size {
        return Err(format!(
            "{} too large: {} bytes (max {} bytes)",
            file_type, size, max_size
        ));
    }
    Ok(())
}

/// Validate JSON payload size
pub fn validate_json_size(json: &str) -> Result<(), String> {
    let size = json.len();
    if size > MAX_JSON_SIZE {
        return Err(format!(
            "JSON payload too large: {} bytes (max {} bytes)",
            size, MAX_JSON_SIZE
        ));
    }
    Ok(())
}

/// Validate scene content size
pub fn validate_scene_content(content: &str) -> Result<(), String> {
    let size = content.len() as u64;
    validate_file_size(size, MAX_SCENE_SIZE, "Scene content")
}

// ============================================================================
// Content Validation
// ============================================================================

/// Validate that a string contains no null bytes
/// (Null bytes can cause issues in file systems and databases)
pub fn validate_no_null_bytes(input: &str, field_name: &str) -> Result<(), String> {
    if input.contains('\0') {
        return Err(format!("{} contains null bytes", field_name));
    }
    Ok(())
}

/// Validate UUID format using the uuid crate
pub fn validate_uuid_format(uuid_str: &str) -> Result<(), String> {
    if uuid_str.is_empty() {
        return Err("UUID cannot be empty".to_string());
    }

    uuid::Uuid::parse_str(uuid_str)
        .map(|_| ())
        .map_err(|e| format!("Invalid UUID format: {}", e))
}

/// Validate that a path is within the allowed app directory
/// 
/// This prevents path traversal attacks where malicious input could access
/// files outside the application's data directory.
pub fn validate_path_within_app_dir(path: &Path, app_dir: &Path) -> Result<(), String> {
    // Canonicalize both paths to resolve any .. or symlinks
    let canonical_path = path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path: {}", e))?;
    
    let canonical_app_dir = app_dir
        .canonicalize()
        .map_err(|e| format!("Failed to resolve app directory: {}", e))?;

    // Check if path starts with app directory
    if !canonical_path.starts_with(&canonical_app_dir) {
        return Err("Path is outside allowed application directory".to_string());
    }

    Ok(())
}

// ============================================================================
// Combined Validators
// ============================================================================

/// Validate a project creation request
pub fn validate_project_creation(
    title: &str,
    author: Option<&str>,
) -> Result<(), String> {
    validate_project_title(title)?;
    validate_no_null_bytes(title, "Project title")?;

    if let Some(author_name) = author {
        if author_name.len() > 200 {
            return Err("Author name too long (max 200 characters)".to_string());
        }
        validate_no_null_bytes(author_name, "Author name")?;
    }

    Ok(())
}

/// Validate a scene save request
pub fn validate_scene_save(
    title: &str,
    content: &str,
) -> Result<(), String> {
    validate_scene_title(title)?;
    validate_scene_content(content)?;
    validate_no_null_bytes(title, "Scene title")?;
    validate_no_null_bytes(content, "Scene content")?;

    Ok(())
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_project_title_valid() {
        assert!(validate_project_title("My Novel").is_ok());
        assert!(validate_project_title("The Great Adventure").is_ok());
        assert!(validate_project_title("Novel-2024").is_ok());
    }

    #[test]
    fn test_validate_project_title_empty() {
        assert!(validate_project_title("").is_err());
    }

    #[test]
    fn test_validate_project_title_too_long() {
        let long_title = "a".repeat(MAX_PROJECT_TITLE_LENGTH + 1);
        assert!(validate_project_title(&long_title).is_err());
    }

    #[test]
    fn test_validate_project_title_path_separators() {
        assert!(validate_project_title("../etc/passwd").is_err());
        assert!(validate_project_title("novel/chapter").is_err());
        assert!(validate_project_title("novel\\chapter").is_err());
    }

    #[test]
    fn test_validate_project_title_dangerous_chars() {
        assert!(validate_project_title("novel*").is_err());
        assert!(validate_project_title("novel?").is_err());
        assert!(validate_project_title("novel<test>").is_err());
    }

    #[test]
    fn test_validate_project_title_dots() {
        assert!(validate_project_title(".").is_err());
        assert!(validate_project_title("..").is_err());
        assert!(validate_project_title(".hidden").is_err());
    }

    #[test]
    fn test_sanitize_path_component() {
        assert_eq!(sanitize_path_component("My Novel"), "my-novel");
        assert_eq!(sanitize_path_component("The Great Adventure!"), "the-great-adventure");
        assert_eq!(sanitize_path_component("  Spaces  "), "spaces");
        assert_eq!(sanitize_path_component("../../../etc/passwd"), "etc_passwd");
    }

    #[test]
    fn test_validate_file_size() {
        assert!(validate_file_size(1000, 2000, "Test").is_ok());
        assert!(validate_file_size(3000, 2000, "Test").is_err());
    }

    #[test]
    fn test_validate_json_size() {
        let small_json = r#"{"key": "value"}"#;
        assert!(validate_json_size(small_json).is_ok());

        let large_json = "x".repeat(MAX_JSON_SIZE + 1);
        assert!(validate_json_size(&large_json).is_err());
    }

    #[test]
    fn test_validate_no_null_bytes() {
        assert!(validate_no_null_bytes("normal text", "Field").is_ok());
        assert!(validate_no_null_bytes("text\0with\0nulls", "Field").is_err());
    }

    #[test]
    fn test_validate_uuid_format() {
        assert!(validate_uuid_format("550e8400-e29b-41d4-a716-446655440000").is_ok());
        assert!(validate_uuid_format("invalid-uuid").is_err());
        assert!(validate_uuid_format("").is_err());
        assert!(validate_uuid_format("not-a-uuid-at-all").is_err());
    }

    #[test]
    fn test_validate_scene_content() {
        let small_content = "This is a normal scene content";
        assert!(validate_scene_content(small_content).is_ok());

        // Don't actually create 10MB+ string in test, just test the logic
        let size_bytes = 100u64;
        assert!(validate_file_size(size_bytes, MAX_SCENE_SIZE, "Scene").is_ok());
    }
}
