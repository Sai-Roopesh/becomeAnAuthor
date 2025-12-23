// Scene-related models

use serde::{Deserialize, Serialize};
use crate::utils::timestamp;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SceneMeta {
    pub id: String,
    pub title: String,
    pub order: i32,
    pub status: String,
    pub word_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pov_character: Option<String>,
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
pub struct Scene {
    #[serde(flatten)]
    pub meta: SceneMeta,
    pub content: String,
}

/// YAML frontmatter structure for serde_yaml parsing
#[derive(Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct YamlSceneMeta {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub order: i32,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default)]
    pub word_count: i32,
    #[serde(default)]
    pub pov_character: Option<String>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

fn default_status() -> String {
    "draft".to_string()
}
