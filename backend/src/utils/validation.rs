// Input Validation & Sanitization Utilities
// Prevents path traversal, oversized payloads, and invalid input

// ============================================================================
// Constants
// ============================================================================

/// Maximum length for project titles
pub const MAX_PROJECT_TITLE_LENGTH: usize = 200;

/// Maximum file size for scenes (10 MB)
pub const MAX_SCENE_SIZE: u64 = 10 * 1024 * 1024;

/// Maximum JSON payload size (5 MB)
pub const MAX_JSON_SIZE: usize = 5 * 1024 * 1024;

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
    let dangerous_chars = ['*', '?', '<', '>', '|', ':', '"', '\0', '~'];
    if title.chars().any(|c| dangerous_chars.contains(&c)) {
        return Err("Project title contains invalid characters".to_string());
    }

    Ok(())
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

// ============================================================================
// Combined Validators
// ============================================================================

/// Validate a project creation request
pub fn validate_project_creation(title: &str, author: Option<&str>) -> Result<(), String> {
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

}
