#[cfg(test)]
mod tests {
    use app_lib::commands::scene;
    use app_lib::utils::validate_project_title;

    #[test]
    fn test_path_traversal_prevention() {
        assert!(validate_project_title("../etc/passwd").is_err());
        assert!(validate_project_title("..").is_err());
        assert!(validate_project_title("/root").is_err());
    }

    #[test]
    fn test_scene_commands_reject_path_traversal_filenames() {
        let result = scene::save_scene(
            "/tmp".to_string(),
            "../escape.md".to_string(),
            "content".to_string(),
            None,
            0,
        );
        assert!(result.is_err());
    }
}
