// Analysis and backup models

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Analysis {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "type")]
    pub analysis_type: String,
    pub title: String,
    pub content: serde_json::Value,
    pub scope: serde_json::Value,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

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
