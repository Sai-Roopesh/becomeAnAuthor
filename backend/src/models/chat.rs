// Chat-related models

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatThread {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub name: String,  // Made required to match frontend
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub archived: bool,
    #[serde(skip_serializing_if = "Option::is_none", rename = "deletedAt")]
    pub deleted_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "defaultModel")]
    pub default_model: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub id: String,
    #[serde(rename = "threadId")]
    pub thread_id: String,
    pub role: String,  // "user" | "assistant"
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    pub timestamp: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatThreadWithMessages {
    #[serde(flatten)]
    pub thread: ChatThread,
    pub messages: Vec<ChatMessage>,
}
