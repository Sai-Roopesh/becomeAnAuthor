#[cfg(test)]
mod tests {
    use app_lib::commands::{scene, trash};
    use app_lib::utils::{sanitize_path_component, validate_project_title};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn test_path_traversal_prevention() {
        assert!(validate_project_title("../etc/passwd").is_err());
        assert!(validate_project_title("..").is_err());
        assert!(validate_project_title("/root").is_err());
    }

    #[test]
    fn test_sanitize_path_component_security() {
        assert_eq!(
            sanitize_path_component("../../../../../etc/passwd"),
            "etc_passwd"
        );
        assert_eq!(
            sanitize_path_component("my*unsafe?title"),
            "my_unsafe_title"
        );
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

    #[test]
    fn test_trash_commands_reject_path_traversal_item_ids() {
        let result = trash::permanent_delete(
            "/tmp".to_string(),
            "../escape".to_string(),
            "scene".to_string(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_trash_commands_accept_valid_uuid_item_ids() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock drift")
            .as_nanos();
        let project_path = std::env::temp_dir().join(format!("baa-security-{nanos}"));
        fs::create_dir_all(project_path.join(".meta").join("trash")).expect("create trash dir");

        let item_id = "123e4567-e89b-12d3-a456-426614174000".to_string();
        let result = trash::permanent_delete(
            project_path.to_string_lossy().to_string(),
            item_id,
            "scene".to_string(),
        );
        assert!(result.is_ok());

        let _ = fs::remove_dir_all(project_path);
    }
}
