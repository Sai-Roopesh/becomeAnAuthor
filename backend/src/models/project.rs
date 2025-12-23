// Project-related models

use serde::{Deserialize, Serialize};
use crate::utils::timestamp;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectMeta {
    pub id: String,
    pub title: String,
    pub author: String,
    pub description: String,
    pub path: String,
    #[serde(default)]
    pub archived: bool,
    /// Series this project belongs to (REQUIRED)
    pub series_id: String,
    /// Position in series (e.g., "Book 1", "Book 2")
    pub series_index: String,
    #[serde(
        serialize_with = "timestamp::serialize_as_rfc3339",
        deserialize_with = "timestamp::deserialize_from_rfc3339"
    )]
    pub created_at: i64,
    #[serde(
        serialize_with = "timestamp::serialize_as_rfc3339",
        deserialize_with = "timestamp::deserialize_from_rfc3339"
    )]
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StructureNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,  // "act", "chapter", "scene"
    pub title: String,
    pub order: i32,
    #[serde(default)]
    pub children: Vec<StructureNode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,  // Only for scenes
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Series {
    pub id: String,
    pub title: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}
