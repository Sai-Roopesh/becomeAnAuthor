// Commands module - All Tauri commands organized by domain

pub mod project;
pub mod scene;
pub mod codex;
pub mod chat;
pub mod snippet;
pub mod analysis;
pub mod backup;
pub mod search;
pub mod trash;
pub mod series;
pub mod seed;
pub mod security;
pub mod mention;
pub mod collaboration;

// Re-export all commands for easy access in lib.rs
pub use project::*;
pub use scene::*;
pub use codex::*;
pub use chat::*;
pub use snippet::*;
pub use analysis::*;
pub use backup::*;
pub use search::*;
pub use trash::*;
pub use series::*;
pub use seed::*;
pub use mention::*;
pub use collaboration::*;
