// Codex commands

use serde::{de::DeserializeOwned, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::models::{
    CodexEntry, CodexEntryTag, CodexRelation, CodexRelationType, CodexTag, CodexTemplate,
    SceneCodexLink,
};

fn read_json_vec<T>(path: &Path) -> Result<Vec<T>, String>
where
    T: DeserializeOwned,
{
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON array at {}: {}", path.display(), e))
}

fn write_json_vec<T>(path: &Path, items: &[T]) -> Result<(), String>
where
    T: Serialize,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json = serde_json::to_string_pretty(items).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn meta_json_path(project_path: &str, file_name: &str) -> PathBuf {
    PathBuf::from(project_path).join(".meta").join(file_name)
}

#[allow(clippy::redundant_closure)]
fn upsert_json_vec<T, F>(path: &Path, item: T, mut is_match: F) -> Result<(), String>
where
    T: DeserializeOwned + Serialize,
    F: FnMut(&T) -> bool,
{
    let mut items: Vec<T> = read_json_vec(path)?;
    if let Some(idx) = items.iter().position(|existing| is_match(existing)) {
        items[idx] = item;
    } else {
        items.push(item);
    }
    write_json_vec(path, &items)
}

fn retain_json_vec<T, F>(path: &Path, mut keep: F) -> Result<(), String>
where
    T: DeserializeOwned + Serialize,
    F: FnMut(&T) -> bool,
{
    let mut items: Vec<T> = read_json_vec(path)?;
    items.retain(|item| keep(item));
    write_json_vec(path, &items)
}

#[tauri::command]
pub fn list_codex_entries(project_path: String) -> Result<Vec<CodexEntry>, String> {
    let codex_dir = PathBuf::from(&project_path).join(".meta/codex");
    let mut entries = Vec::new();

    if !codex_dir.exists() {
        return Ok(entries);
    }

    for entry in WalkDir::new(&codex_dir)
        .min_depth(2)
        .max_depth(2)
        .into_iter()
        .flatten()
    {
        if entry.file_type().is_file() && entry.path().extension().is_some_and(|e| e == "json") {
            let content = fs::read_to_string(entry.path()).map_err(|e| {
                format!(
                    "Failed to read codex entry {}: {}",
                    entry.path().display(),
                    e
                )
            })?;
            let codex_entry = serde_json::from_str::<CodexEntry>(&content).map_err(|e| {
                format!(
                    "Failed to parse codex entry {}: {}",
                    entry.path().display(),
                    e
                )
            })?;
            entries.push(codex_entry);
        }
    }

    Ok(entries)
}

#[tauri::command]
pub fn save_codex_entry(project_path: String, entry: CodexEntry) -> Result<(), String> {
    let entry_path = PathBuf::from(&project_path)
        .join(".meta")
        .join("codex")
        .join(&entry.category)
        .join(format!("{}.json", entry.id));
    let parent_dir = entry_path
        .parent()
        .ok_or_else(|| format!("Invalid codex entry path: {:?}", entry_path))?;
    fs::create_dir_all(parent_dir)
        .map_err(|e| format!("Failed to create codex directory: {}", e))?;
    let json = serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?;
    fs::write(&entry_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_entry(
    project_path: String,
    entry_id: String,
    category: String,
) -> Result<(), String> {
    let project_root = PathBuf::from(&project_path);
    let codex_root = project_root.join(".meta").join("codex");
    let entry_filename = format!("{}.json", entry_id);

    // Delete every matching codex entry file to avoid stale duplicates across categories.
    if codex_root.exists() {
        for entry in WalkDir::new(&codex_root)
            .min_depth(2)
            .max_depth(2)
            .into_iter()
            .flatten()
        {
            if entry.file_type().is_file() && entry.file_name().to_string_lossy() == entry_filename
            {
                fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
            }
        }
    }

    // Backstop the provided category path as well.
    let entry_path = codex_root.join(&category).join(&entry_filename);
    if entry_path.exists() {
        fs::remove_file(entry_path).map_err(|e| e.to_string())?;
    }

    // Cascade remove relationships involving this entry.
    let relations_path = project_root.join(".meta").join("codex_relations.json");
    let mut relations: Vec<CodexRelation> = read_json_vec(&relations_path)?;
    relations.retain(|relation| relation.parent_id != entry_id && relation.child_id != entry_id);
    write_json_vec(&relations_path, &relations)?;

    // Cascade remove scene links pointing to this entry.
    let scene_links_path = project_root.join(".meta").join("scene_codex_links.json");
    let mut scene_links: Vec<SceneCodexLink> = read_json_vec(&scene_links_path)?;
    scene_links.retain(|link| link.codex_id != entry_id);
    write_json_vec(&scene_links_path, &scene_links)?;

    // Cascade remove entry-tag associations for this entry.
    let entry_tags_path = project_root.join(".meta").join("codex_entry_tags.json");
    let mut entry_tags: Vec<CodexEntryTag> = read_json_vec(&entry_tags_path)?;
    entry_tags.retain(|entry_tag| entry_tag.entry_id != entry_id);
    write_json_vec(&entry_tags_path, &entry_tags)?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_tag(project_path: String, tag_id: String) -> Result<(), String> {
    let project_root = PathBuf::from(&project_path);
    let tags_path = project_root.join(".meta").join("codex_tags.json");
    retain_json_vec::<CodexTag, _>(&tags_path, |tag| tag.id != tag_id)?;

    let entry_tags_path = project_root.join(".meta").join("codex_entry_tags.json");
    retain_json_vec::<CodexEntryTag, _>(&entry_tags_path, |entry_tag| entry_tag.tag_id != tag_id)?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_relation_type(project_path: String, type_id: String) -> Result<(), String> {
    let project_root = PathBuf::from(&project_path);
    let relation_types_path = project_root.join(".meta").join("codex_relation_types.json");
    retain_json_vec::<CodexRelationType, _>(&relation_types_path, |rel_type| {
        rel_type.id != type_id
    })?;

    let relations_path = project_root.join(".meta").join("codex_relations.json");
    retain_json_vec::<CodexRelation, _>(&relations_path, |relation| {
        relation.type_id.as_deref() != Some(type_id.as_str())
    })?;

    Ok(())
}

// Codex Relations
#[tauri::command]
pub fn list_codex_relations(project_path: String) -> Result<Vec<CodexRelation>, String> {
    read_json_vec(&meta_json_path(&project_path, "codex_relations.json"))
}

#[tauri::command]
pub fn save_codex_relation(project_path: String, relation: CodexRelation) -> Result<(), String> {
    let relations_path = meta_json_path(&project_path, "codex_relations.json");
    let relation_id = relation.id.clone();
    upsert_json_vec(&relations_path, relation, |existing: &CodexRelation| {
        existing.id == relation_id
    })
}

#[tauri::command]
pub fn delete_codex_relation(project_path: String, relation_id: String) -> Result<(), String> {
    let relations_path = meta_json_path(&project_path, "codex_relations.json");
    retain_json_vec::<CodexRelation, _>(&relations_path, |relation| relation.id != relation_id)
}

// Codex Tags
#[tauri::command]
pub fn list_codex_tags(project_path: String) -> Result<Vec<CodexTag>, String> {
    read_json_vec(&meta_json_path(&project_path, "codex_tags.json"))
}

#[tauri::command]
pub fn save_codex_tag(project_path: String, tag: CodexTag) -> Result<(), String> {
    let path = meta_json_path(&project_path, "codex_tags.json");
    let tag_id = tag.id.clone();
    upsert_json_vec(&path, tag, |existing: &CodexTag| existing.id == tag_id)
}

// Entry Tags
#[tauri::command]
pub fn list_codex_entry_tags(project_path: String) -> Result<Vec<CodexEntryTag>, String> {
    read_json_vec(&meta_json_path(&project_path, "codex_entry_tags.json"))
}

#[tauri::command]
pub fn save_codex_entry_tag(project_path: String, entry_tag: CodexEntryTag) -> Result<(), String> {
    let path = meta_json_path(&project_path, "codex_entry_tags.json");
    let entry_tag_id = entry_tag.id.clone();
    upsert_json_vec(&path, entry_tag, |existing: &CodexEntryTag| {
        existing.id == entry_tag_id
    })
}

#[tauri::command]
pub fn delete_codex_entry_tag(project_path: String, entry_tag_id: String) -> Result<(), String> {
    let path = meta_json_path(&project_path, "codex_entry_tags.json");
    retain_json_vec::<CodexEntryTag, _>(&path, |entry_tag| entry_tag.id != entry_tag_id)
}

// Templates
#[tauri::command]
pub fn list_codex_templates(project_path: String) -> Result<Vec<CodexTemplate>, String> {
    read_json_vec(&meta_json_path(&project_path, "codex_templates.json"))
}

#[tauri::command]
pub fn save_codex_template(project_path: String, template: CodexTemplate) -> Result<(), String> {
    let path = meta_json_path(&project_path, "codex_templates.json");
    let template_id = template.id.clone();
    upsert_json_vec(&path, template, |existing: &CodexTemplate| {
        existing.id == template_id
    })
}

#[tauri::command]
pub fn delete_codex_template(project_path: String, template_id: String) -> Result<(), String> {
    let path = meta_json_path(&project_path, "codex_templates.json");
    retain_json_vec::<CodexTemplate, _>(&path, |template| template.id != template_id)
}

// Relation Types
#[tauri::command]
pub fn list_codex_relation_types(project_path: String) -> Result<Vec<CodexRelationType>, String> {
    read_json_vec(&meta_json_path(&project_path, "codex_relation_types.json"))
}

#[tauri::command]
pub fn save_codex_relation_type(
    project_path: String,
    rel_type: CodexRelationType,
) -> Result<(), String> {
    let path = meta_json_path(&project_path, "codex_relation_types.json");
    let rel_type_id = rel_type.id.clone();
    upsert_json_vec(&path, rel_type, |existing: &CodexRelationType| {
        existing.id == rel_type_id
    })
}

// Scene Codex Links
#[tauri::command]
pub fn list_scene_codex_links(project_path: String) -> Result<Vec<SceneCodexLink>, String> {
    read_json_vec(&meta_json_path(&project_path, "scene_codex_links.json"))
}

#[tauri::command]
pub fn save_scene_codex_link(project_path: String, link: SceneCodexLink) -> Result<(), String> {
    let path = meta_json_path(&project_path, "scene_codex_links.json");
    let mut links: Vec<SceneCodexLink> = read_json_vec(&path)?;

    if let Some(idx) = links
        .iter()
        .position(|l| l.scene_id == link.scene_id && l.codex_id == link.codex_id)
    {
        let mut merged = link.clone();
        // Keep stable identity and original creation time for existing scene+codex pair.
        merged.id = links[idx].id.clone();
        merged.created_at = links[idx].created_at;
        links[idx] = merged;
    } else if let Some(idx) = links.iter().position(|l| l.id == link.id) {
        links[idx] = link;
    } else {
        links.push(link);
    }
    write_json_vec(&path, &links)
}

#[tauri::command]
pub fn delete_scene_codex_link(project_path: String, link_id: String) -> Result<(), String> {
    let path = meta_json_path(&project_path, "scene_codex_links.json");
    retain_json_vec::<SceneCodexLink, _>(&path, |link| link.id != link_id)
}
