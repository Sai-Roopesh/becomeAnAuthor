// Scene-related models

use crate::utils::timestamp;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SceneMeta {
    pub id: String,
    pub title: String,
    pub order: i32,
    pub status: String,
    pub word_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pov_character: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtitle: Option<String>,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub exclude_from_ai: bool,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub archived: bool,
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
