// Project-related models

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectMeta {
    pub id: String,
    pub title: String,
    pub author: String,
    pub description: String,
    pub path: String,
    #[serde(default)]
    pub archived: bool,
    pub created_at: String,
    pub updated_at: String,
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
