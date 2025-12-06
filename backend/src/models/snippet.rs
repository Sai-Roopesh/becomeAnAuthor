// Snippet model

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Snippet {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub title: String,
    pub content: serde_json::Value,
    #[serde(default)]
    pub pinned: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}
