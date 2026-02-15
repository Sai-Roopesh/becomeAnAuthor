// Analysis and backup models

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Analysis {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "analysisType")]
    pub analysis_type: String,
    pub title: String,
    pub content: serde_json::Value,
    pub scope: String,  // 'full', 'act', 'chapter', 'scene'
    #[serde(rename = "scopeIds", default)]
    pub scope_ids: Vec<String>,
    
    // Results structure
    pub results: serde_json::Value,  // Contains summary, insights, metrics
    
    // Version tracking
    #[serde(rename = "manuscriptVersion", default)]
    pub manuscript_version: i64,
    #[serde(rename = "wordCountAtAnalysis", default)]
    pub word_count_at_analysis: i32,
    #[serde(rename = "scenesAnalyzedCount", default)]
    pub scenes_analyzed_count: i32,
    
    // AI metadata
    #[serde(default)]
    pub model: String,
    #[serde(rename = "tokensUsed", skip_serializing_if = "Option::is_none")]
    pub tokens_used: Option<i32>,
    
    // User interaction
    #[serde(default)]
    pub dismissed: bool,
    #[serde(default)]
    pub resolved: bool,
    #[serde(rename = "userNotes", skip_serializing_if = "Option::is_none")]
    pub user_notes: Option<String>,
    
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
