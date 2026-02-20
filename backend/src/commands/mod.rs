// Commands module - All Tauri commands organized by domain

pub mod backup;
pub mod chat;
pub mod codex;
pub mod collaboration;
pub mod google_oauth;
pub mod idea;
pub mod mention;
pub mod project;
pub mod scene;
pub mod scene_note;
pub mod search;
pub mod security;
pub mod series;
pub mod snippet;
pub mod trash;
pub mod world_map;
pub mod world_timeline;

// Re-export all commands for easy access in lib.rs
pub use backup::*;
pub use chat::*;
pub use codex::*;
pub use collaboration::*;
pub use google_oauth::*;
pub use idea::*;
pub use mention::*;
pub use project::*;
pub use scene::*;
pub use scene_note::*;
pub use search::*;
pub use series::*;
pub use snippet::*;
pub use trash::*;
pub use world_map::*;
pub use world_timeline::*;
