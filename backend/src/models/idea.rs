use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Idea {
    pub id: String,
    pub project_id: String,
    pub content: String,
    pub category: String,
    pub tags: Vec<String>,
    pub archived: bool,
    pub created_at: i64,
    pub updated_at: i64,
}
