#[cfg(test)]
mod tests {
    use std::env;
    use std::fs;
    use std::path::PathBuf;

    use app_lib::commands::{
        create_project, create_series, delete_project, delete_series, get_projects_path,
        list_deleted_series, list_project_trash, list_series, restore_trashed_project,
    };

    struct TestChannelGuard {
        previous_channel: Option<String>,
        app_dir: PathBuf,
    }

    impl TestChannelGuard {
        fn new(prefix: &str) -> Self {
            let previous_channel = env::var("BAA_DATA_CHANNEL").ok();
            let channel = format!("{}-{}", prefix, uuid::Uuid::new_v4());
            env::set_var("BAA_DATA_CHANNEL", channel);

            let app_dir = app_lib::utils::get_app_dir().expect("resolve app dir for test channel");
            let _ = fs::remove_dir_all(&app_dir);
            fs::create_dir_all(&app_dir).expect("create isolated test app dir");

            Self {
                previous_channel,
                app_dir,
            }
        }
    }

    impl Drop for TestChannelGuard {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.app_dir);
            if let Some(previous) = &self.previous_channel {
                env::set_var("BAA_DATA_CHANNEL", previous);
            } else {
                env::remove_var("BAA_DATA_CHANNEL");
            }
        }
    }

    #[test]
    fn restore_trashed_project_recreates_deleted_series_without_recovery_bucket() {
        let _guard = TestChannelGuard::new("restore-series-test");

        let series_title = format!("Series {}", uuid::Uuid::new_v4());
        let created_series = create_series(series_title.clone(), None, None, None, None)
            .expect("create series");

        let projects_path = get_projects_path().expect("get projects path");
        let created_project = create_project(
            "Novel One".to_string(),
            "Author".to_string(),
            projects_path,
            created_series.id.clone(),
            "Book 1".to_string(),
        )
        .expect("create project");

        delete_project(created_project.path.clone()).expect("move project to trash");
        delete_series(created_series.id.clone()).expect("delete empty series after project delete");

        let deleted_series_records = list_deleted_series().expect("list deleted series");
        assert!(
            deleted_series_records
                .iter()
                .any(|record| record.old_series_id == created_series.id),
            "deleted series registry should keep a restore mapping for the original series id"
        );

        let trashed_projects = list_project_trash().expect("list project trash");
        assert_eq!(trashed_projects.len(), 1, "exactly one project should be trashed");

        let restored_project = restore_trashed_project(trashed_projects[0].trash_path.clone())
            .expect("restore trashed project");

        let all_series = list_series().expect("list series after restore");
        let recreated_series = all_series
            .iter()
            .find(|series| series.title == series_title)
            .expect("restored project should recreate original deleted series");

        assert_eq!(
            restored_project.series_id, recreated_series.id,
            "restored project should reattach to recreated original series"
        );
        assert!(
            all_series
                .iter()
                .all(|series| series.title != "Recovered Projects"),
            "recovery series should not be created when deleted-series mapping exists"
        );
    }
}
