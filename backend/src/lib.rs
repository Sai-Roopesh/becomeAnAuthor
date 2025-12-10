// Become An Author - Backend Entry Point
//
// This is the main entry point for the Tauri application.
// All functionality is organized into modules:
// - models: Data structures
// - utils: Utility functions
// - commands: Tauri commands organized by domain

pub mod models;
pub mod utils;
pub mod commands;

use commands::*;

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
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Project commands
            get_projects_path,
            list_projects,
            create_project,
            delete_project,
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
            // Analysis commands
            list_analyses,
            save_analysis,
            delete_analysis,
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
            export_project_backup,
            // Import command
            import_project_backup,
            // Series commands
            list_series,
            create_series,
            update_series,
            delete_series,
            // Security commands
            security::store_api_key,
            security::get_api_key,
            security::delete_api_key,
            security::list_api_key_providers,
            // App info
            get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
