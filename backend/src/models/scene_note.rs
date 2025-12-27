use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SceneNote {
    pub id: String,
    pub scene_id: String,
    pub project_id: String,
    pub content: serde_json::Value,
    pub created_at: i64,
    pub updated_at: i64,
}
