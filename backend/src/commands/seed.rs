// Seed data for new projects

use std::fs;
use std::path::PathBuf;

/// Seeds built-in templates and relation types for a new project
pub fn seed_built_in_data(project_dir: &PathBuf) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp_millis();
    
    // Built-in templates for codex entries
    let templates = serde_json::json!([
        {
            "id": "template-character-basic",
            "name": "Basic Character",
            "category": "character",
            "isBuiltIn": true,
            "fields": [
                {"id": "field-age", "name": "Age", "fieldType": "number", "required": false},
                {"id": "field-personality", "name": "Personality", "fieldType": "textarea", "required": false},
                {"id": "field-backstory", "name": "Backstory", "fieldType": "textarea", "required": false},
                {"id": "field-motivation", "name": "Motivation", "fieldType": "text", "required": false},
                {"id": "field-appearance", "name": "Physical Appearance", "fieldType": "textarea", "required": false}
            ],
            "createdAt": now
        },
        {
            "id": "template-location-basic",
            "name": "Basic Location",
            "category": "location",
            "isBuiltIn": true,
            "fields": [
                {"id": "field-description", "name": "Description", "fieldType": "textarea", "required": false},
                {"id": "field-atmosphere", "name": "Atmosphere", "fieldType": "text", "required": false},
                {"id": "field-inhabitants", "name": "Inhabitants", "fieldType": "textarea", "required": false}
            ],
            "createdAt": now
        },
        {
            "id": "template-item-basic",
            "name": "Basic Item",
            "category": "item",
            "isBuiltIn": true,
            "fields": [
                {"id": "field-type", "name": "Type", "fieldType": "text", "required": false},
                {"id": "field-value", "name": "Value/Importance", "fieldType": "text", "required": false},
                {"id": "field-description", "name": "Description", "fieldType": "textarea", "required": false}
            ],
            "createdAt": now
        }
    ]);
    
    // Built-in relation types for codex connections
    let relation_types = serde_json::json!([
        {"id": "rel-friend", "name": "Friend", "category": "personal", "color": "#4ade80", "isBuiltIn": true, "isDirectional": false, "canHaveStrength": true},
        {"id": "rel-enemy", "name": "Enemy", "category": "personal", "color": "#ef4444", "isBuiltIn": true, "isDirectional": false, "canHaveStrength": true},
        {"id": "rel-family", "name": "Family", "category": "personal", "color": "#60a5fa", "isBuiltIn": true, "isDirectional": false, "canHaveStrength": false},
        {"id": "rel-romantic", "name": "Romantic Partner", "category": "personal", "color": "#f472b6", "isBuiltIn": true, "isDirectional": false, "canHaveStrength": true},
        {"id": "rel-mentor", "name": "Mentor/Mentee", "category": "professional", "color": "#a78bfa", "isBuiltIn": true, "isDirectional": true, "canHaveStrength": false},
        {"id": "rel-rival", "name": "Rival", "category": "personal", "color": "#fbbf24", "isBuiltIn": true, "isDirectional": false, "canHaveStrength": true},
        {"id": "rel-located-in", "name": "Located In", "category": "spatial", "color": "#2dd4bf", "isBuiltIn": true, "isDirectional": true, "canHaveStrength": false},
        {"id": "rel-owns", "name": "Owns", "category": "possession", "color": "#818cf8", "isBuiltIn": true, "isDirectional": true, "canHaveStrength": false}
    ]);
    
    // Write templates
    let templates_json = serde_json::to_string_pretty(&templates).map_err(|e| e.to_string())?;
    fs::write(project_dir.join(".meta/codex_templates.json"), templates_json).map_err(|e| e.to_string())?;
    
    // Write relation types
    let rel_types_json = serde_json::to_string_pretty(&relation_types).map_err(|e| e.to_string())?;
    fs::write(project_dir.join(".meta/codex_relation_types.json"), rel_types_json).map_err(|e| e.to_string())?;
    
    Ok(())
}
