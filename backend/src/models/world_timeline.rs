use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorldEventTemporal {
    pub precision: String,
    pub year: i32,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorldEvent {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub temporal: WorldEventTemporal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub era: Option<String>,
    pub category: String,
    pub importance: String,
    pub linked_codex_ids: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
