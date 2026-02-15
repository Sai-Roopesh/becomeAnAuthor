use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EmergencyBackup {
    pub id: String,
    #[serde(rename = "sceneId")]
    pub scene_id: String,
    pub content: String,
    pub timestamp: i64,
    #[serde(rename = "expiresAt")]
    pub expires_at: i64,
}
