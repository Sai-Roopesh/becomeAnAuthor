// Become An Author - Backend Entry Point
//
// This is the main entry point for the Tauri application.
// All functionality is organized into modules:
// - models: Data structures
// - utils: Utility functions
// - commands: Tauri commands organized by domain

pub mod commands;
pub mod models;
pub mod utils;

use commands::*;
use std::env;

#[tauri::command]
fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "Become An Author",
        "version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut updater_builder = tauri_plugin_updater::Builder::new();
    if let Ok(pubkey) = env::var("TAURI_UPDATER_PUBLIC_KEY") {
        if !pubkey.trim().is_empty() {
            updater_builder = updater_builder.pubkey(pubkey);
        }
    }

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                // Silence noisy windowing library trace logs
                .level_for("tao", log::LevelFilter::Warn)
                .level_for("wry", log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(updater_builder.build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            // Project commands
            get_projects_path,
            list_projects,
            list_recent_projects,
            add_to_recent,
            remove_from_recent,
            open_project,
            create_project,
            delete_project,
            list_project_trash,
            restore_trashed_project,
            permanently_delete_trashed_project,
            update_project,
            archive_project,
            get_structure,
            save_structure,
            create_node,
            rename_node,
            delete_node,
            // Scene commands
            load_scene,
            save_scene,
            update_scene_metadata,
            save_scene_by_id,
            delete_scene,
            // Codex commands
            list_codex_entries,
            save_codex_entry,
            delete_codex_entry,
            // Snippet commands
            list_snippets,
            save_snippet,
            delete_snippet,
            // Chat commands
            list_chat_threads,
            get_chat_thread,
            create_chat_thread,
            update_chat_thread,
            delete_chat_thread,
            get_chat_messages,
            create_chat_message,
            update_chat_message,
            delete_chat_message,
            // Codex enhancement commands
            list_codex_relations,
            save_codex_relation,
            delete_codex_relation,
            list_codex_tags,
            save_codex_tag,
            delete_codex_tag,
            list_codex_entry_tags,
            save_codex_entry_tag,
            delete_codex_entry_tag,
            list_codex_templates,
            save_codex_template,
            delete_codex_template,
            list_codex_relation_types,
            save_codex_relation_type,
            delete_codex_relation_type,
            list_scene_codex_links,
            save_scene_codex_link,
            delete_scene_codex_link,
            // Emergency backup commands
            save_emergency_backup,
            get_emergency_backup,
            delete_emergency_backup,
            cleanup_emergency_backups,
            // Search
            search_project,
            // Trash commands (soft delete)
            move_to_trash,
            restore_from_trash,
            list_trash,
            permanent_delete,
            empty_trash,
            // Export commands
            export_manuscript_text,
            export_manuscript_docx,
            export_manuscript_epub,
            export_series_backup,
            export_series_as_json,
            export_project_backup,
            export_project_as_json,
            write_export_file,
            // Import command
            import_series_backup,
            import_project_backup,
            // Series commands
            list_series,
            list_deleted_series,
            permanently_delete_deleted_series,
            create_series,
            update_series,
            delete_series,
            delete_series_cascade,
            restore_deleted_series,
            // Series Codex commands
            list_series_codex_entries,
            get_series_codex_entry,
            save_series_codex_entry,
            delete_series_codex_entry,
            list_series_codex_relations,
            save_series_codex_relation,
            delete_series_codex_relation,
            migrate_codex_to_series,
            // Security commands
            security::store_api_key,
            security::get_api_key,
            security::delete_api_key,
            security::list_api_key_providers,
            google_oauth_connect,
            google_oauth_get_access_token,
            google_oauth_get_user,
            google_oauth_sign_out,
            // Mention tracking commands
            find_mentions,
            count_mentions,
            // Collaboration commands (Yjs state persistence)
            save_yjs_state,
            load_yjs_state,
            has_yjs_state,
            delete_yjs_state,
            // Idea commands
            list_ideas,
            create_idea,
            update_idea,
            delete_idea,
            // Scene note commands
            get_scene_note,
            save_scene_note,
            delete_scene_note,
            // Map commands
            list_maps,
            save_map,
            delete_map,
            upload_map_image,
            // World timeline commands
            list_world_events,
            save_world_event,
            delete_world_event,
            // App info
            get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
