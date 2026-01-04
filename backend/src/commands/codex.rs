// Codex commands

use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

use crate::models::{CodexEntry, CodexRelation, CodexTag, CodexEntryTag, CodexTemplate, CodexRelationType, SceneCodexLink};

#[tauri::command]
pub fn list_codex_entries(project_path: String) -> Result<Vec<CodexEntry>, String> {
    let codex_dir = PathBuf::from(&project_path).join(".meta/codex");
    let mut entries = Vec::new();
    
    if !codex_dir.exists() {
        return Ok(entries);
    }
    
    for entry in WalkDir::new(&codex_dir).min_depth(2).max_depth(2).into_iter().flatten() {
        if entry.file_type().is_file() && entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(codex_entry) = serde_json::from_str::<CodexEntry>(&content) {
                    entries.push(codex_entry);
                }
            }
        }
    }
    
    Ok(entries)
}

#[tauri::command]
pub fn save_codex_entry(project_path: String, entry: CodexEntry) -> Result<(), String> {
    let entry_path = PathBuf::from(&project_path).join(".meta").join("codex").join(&entry.category).join(format!("{}.json", entry.id));
    let parent_dir = entry_path.parent()
        .ok_or_else(|| format!("Invalid codex entry path: {:?}", entry_path))?;
    fs::create_dir_all(parent_dir)
        .map_err(|e| format!("Failed to create codex directory: {}", e))?;
    let json = serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?;
    fs::write(&entry_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_codex_entry(project_path: String, entry_id: String, category: String) -> Result<(), String> {
    let entry_path = PathBuf::from(&project_path)
        .join("codex")
        .join(&category)
        .join(format!("{}.json", entry_id));
    
    if entry_path.exists() {
        fs::remove_file(&entry_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// Codex Relations
#[tauri::command]
pub fn list_codex_relations(project_path: String) -> Result<Vec<CodexRelation>, String> {
    let relations_path = PathBuf::from(&project_path).join(".meta/codex_relations.json");
    if !relations_path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&relations_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_codex_relation(project_path: String, relation: CodexRelation) -> Result<(), String> {
    let relations_path = PathBuf::from(&project_path).join(".meta/codex_relations.json");
    // Read existing relations directly to avoid cloning project_path
    let mut relations: Vec<CodexRelation> = if relations_path.exists() {
        let content = fs::read_to_string(&relations_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    if let Some(idx) = relations.iter().position(|r| r.id == relation.id) {
        relations[idx] = relation;
    } else {
        relations.push(relation);
    }
    
    let json = serde_json::to_string_pretty(&relations).map_err(|e| e.to_string())?;
    fs::write(&relations_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_codex_relation(project_path: String, relation_id: String) -> Result<(), String> {
    let relations_path = PathBuf::from(&project_path).join(".meta/codex_relations.json");
    let mut relations = list_codex_relations(project_path).unwrap_or_default();
    relations.retain(|r| r.id != relation_id);
    let json = serde_json::to_string_pretty(&relations).map_err(|e| e.to_string())?;
    fs::write(&relations_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// Codex Tags
#[tauri::command]
pub fn list_codex_tags(project_path: String) -> Result<Vec<CodexTag>, String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_tags.json");
    if !path.exists() { return Ok(Vec::new()); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_codex_tag(project_path: String, tag: CodexTag) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_tags.json");
    // Read existing tags directly to avoid cloning project_path
    let mut tags: Vec<CodexTag> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    if let Some(idx) = tags.iter().position(|t| t.id == tag.id) {
        tags[idx] = tag;
    } else {
        tags.push(tag);
    }
    let json = serde_json::to_string_pretty(&tags).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_codex_tag(project_path: String, tag_id: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_tags.json");
    let mut tags = list_codex_tags(project_path).unwrap_or_default();
    tags.retain(|t| t.id != tag_id);
    let json = serde_json::to_string_pretty(&tags).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// Entry Tags
#[tauri::command]
pub fn list_codex_entry_tags(project_path: String) -> Result<Vec<CodexEntryTag>, String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_entry_tags.json");
    if !path.exists() { return Ok(Vec::new()); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_codex_entry_tag(project_path: String, entry_tag: CodexEntryTag) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_entry_tags.json");
    // Read existing entry_tags directly to avoid cloning project_path
    let mut entry_tags: Vec<CodexEntryTag> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    if let Some(idx) = entry_tags.iter().position(|t| t.id == entry_tag.id) {
        entry_tags[idx] = entry_tag;
    } else {
        entry_tags.push(entry_tag);
    }
    let json = serde_json::to_string_pretty(&entry_tags).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_codex_entry_tag(project_path: String, entry_tag_id: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_entry_tags.json");
    let mut entry_tags = list_codex_entry_tags(project_path).unwrap_or_default();
    entry_tags.retain(|t| t.id != entry_tag_id);
    let json = serde_json::to_string_pretty(&entry_tags).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// Templates
#[tauri::command]
pub fn list_codex_templates(project_path: String) -> Result<Vec<CodexTemplate>, String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_templates.json");
    if !path.exists() { return Ok(Vec::new()); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_codex_template(project_path: String, template: CodexTemplate) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_templates.json");
    // Read existing templates directly to avoid cloning project_path
    let mut templates: Vec<CodexTemplate> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    if let Some(idx) = templates.iter().position(|t| t.id == template.id) {
        templates[idx] = template;
    } else {
        templates.push(template);
    }
    let json = serde_json::to_string_pretty(&templates).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_codex_template(project_path: String, template_id: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_templates.json");
    let mut templates = list_codex_templates(project_path).unwrap_or_default();
    templates.retain(|t| t.id != template_id);
    let json = serde_json::to_string_pretty(&templates).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// Relation Types
#[tauri::command]
pub fn list_codex_relation_types(project_path: String) -> Result<Vec<CodexRelationType>, String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_relation_types.json");
    if !path.exists() { return Ok(Vec::new()); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_codex_relation_type(project_path: String, rel_type: CodexRelationType) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_relation_types.json");
    // Read existing types directly to avoid cloning project_path
    let mut types: Vec<CodexRelationType> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    if let Some(idx) = types.iter().position(|t| t.id == rel_type.id) {
        types[idx] = rel_type;
    } else {
        types.push(rel_type);
    }
    let json = serde_json::to_string_pretty(&types).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_codex_relation_type(project_path: String, type_id: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/codex_relation_types.json");
    let mut types = list_codex_relation_types(project_path).unwrap_or_default();
    types.retain(|t| t.id != type_id);
    let json = serde_json::to_string_pretty(&types).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// Scene Codex Links
#[tauri::command]
pub fn list_scene_codex_links(project_path: String) -> Result<Vec<SceneCodexLink>, String> {
    let path = PathBuf::from(&project_path).join(".meta/scene_codex_links.json");
    if !path.exists() { return Ok(Vec::new()); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_scene_codex_link(project_path: String, link: SceneCodexLink) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/scene_codex_links.json");
    // Read existing links directly to avoid cloning project_path
    let mut links: Vec<SceneCodexLink> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    if let Some(idx) = links.iter().position(|l| l.id == link.id) {
        links[idx] = link;
    } else {
        links.push(link);
    }
    let json = serde_json::to_string_pretty(&links).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_scene_codex_link(project_path: String, link_id: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join(".meta/scene_codex_links.json");
    let mut links = list_scene_codex_links(project_path).unwrap_or_default();
    links.retain(|l| l.id != link_id);
    let json = serde_json::to_string_pretty(&links).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}
