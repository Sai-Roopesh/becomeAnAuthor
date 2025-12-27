use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MapMarker {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codex_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMap {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub image_path: String,
    pub markers: Vec<MapMarker>,
    pub zoom_level: f64,
    pub pan_x: f64,
    pub pan_y: f64,
    pub created_at: i64,
    pub updated_at: i64,
}
