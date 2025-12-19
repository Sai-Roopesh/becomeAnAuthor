
#[cfg(test)]
mod tests {
    use app_lib::utils::path_sanitization;

    #[test]
    fn test_path_traversal_prevention() {
        // Direct test of the sanitization utility which underpins the commands
        assert!(path_sanitization::sanitize_path_component("../etc/passwd").is_err());
        assert!(path_sanitization::sanitize_path_component("..").is_err());
        assert!(path_sanitization::sanitize_path_component("/root").is_err());
    }

    #[test]
    fn test_validate_project_path_security() {
        // This attempts to "validate" a path that shouldn't be valid
        // Note: validate_project_path checks for existence, so testing "invalid paths" 
        // usually means testing paths that act maliciously.
        // If we try access via ../ logic, it should fail sanitization before it even hits filesystem usually 
        // OR validate_path_in_app_dir catches it.
        
        let bad_path = "../../../../../etc/passwd";
        assert!(path_sanitization::validate_project_path(bad_path).is_err());
    }
}
