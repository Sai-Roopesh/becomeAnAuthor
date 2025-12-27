use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorldEvent {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub era: Option<String>,
    pub category: String,
    pub importance: String,
    pub linked_codex_ids: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
