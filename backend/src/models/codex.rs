// Codex-related models

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexEntry {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub name: String,
    pub category: String,  // "character", "location", "item", "lore", "subplot"
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub attributes: HashMap<String, String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub references: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "customDetails")]
    pub custom_details: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "aiContext")]
    pub ai_context: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "trackMentions")]
    pub track_mentions: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "externalLinks")]
    pub external_links: Option<Vec<String>>,
    #[serde(default)]
    pub settings: CodexSettings,
    #[serde(skip_serializing_if = "Option::is_none", rename = "templateId")]
    pub template_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "customFields")]
    pub custom_fields: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gallery: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completeness: Option<i32>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct CodexSettings {
    #[serde(skip_serializing_if = "Option::is_none", rename = "showInMentions")]
    pub show_in_mentions: Option<bool>,
    pub fields: Vec<CodexField>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexField {
    pub name: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexRelation {
    pub id: String,
    #[serde(rename = "parentId")]
    pub parent_id: String,
    #[serde(rename = "childId")]
    pub child_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "typeId")]
    pub type_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strength: Option<i32>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexTag {
    pub id: String,
    pub name: String,
    pub color: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexEntryTag {
    pub id: String,
    #[serde(rename = "entryId")]
    pub entry_id: String,
    #[serde(rename = "tagId")]
    pub tag_id: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TemplateField {
    pub id: String,
    pub name: String,
    #[serde(rename = "fieldType")]
    pub field_type: String,
    #[serde(default)]
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none", rename = "defaultValue")]
    pub default_value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexTemplate {
    pub id: String,
    pub name: String,
    pub category: String,
    #[serde(default, rename = "isBuiltIn")]
    pub is_built_in: bool,
    pub fields: Vec<TemplateField>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CodexRelationType {
    pub id: String,
    pub name: String,
    pub category: String,
    pub color: String,
    #[serde(default, rename = "isBuiltIn")]
    pub is_built_in: bool,
    #[serde(default, rename = "isDirectional")]
    pub is_directional: bool,
    #[serde(default, rename = "canHaveStrength")]
    pub can_have_strength: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SceneCodexLink {
    pub id: String,
    #[serde(rename = "sceneId")]
    pub scene_id: String,
    #[serde(rename = "codexId")]
    pub codex_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "autoDetected")]
    pub auto_detected: Option<bool>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}
