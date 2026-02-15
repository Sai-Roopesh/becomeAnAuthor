
#[cfg(test)]
mod tests {
    use app_lib::utils::{sanitize_path_component, validate_project_title};

    #[test]
    fn test_path_traversal_prevention() {
        assert!(validate_project_title("../etc/passwd").is_err());
        assert!(validate_project_title("..").is_err());
        assert!(validate_project_title("/root").is_err());
    }

    #[test]
    fn test_sanitize_path_component_security() {
        assert_eq!(sanitize_path_component("../../../../../etc/passwd"), "etc_passwd");
        assert_eq!(sanitize_path_component("my*unsafe?title"), "my_unsafe_title");
    }
}
