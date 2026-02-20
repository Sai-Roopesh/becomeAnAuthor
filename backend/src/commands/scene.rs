// Scene commands

use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::Deserialize;

use crate::models::{Scene, SceneMeta, YamlSceneMeta};
use crate::utils::{
    atomic_write, count_words, project_dir, timestamp, validate_file_size, validate_no_null_bytes,
    MAX_SCENE_SIZE,
};

fn validate_scene_file_name(scene_file: &str) -> Result<(), String> {
    let trimmed = scene_file.trim();
    if trimmed.is_empty() {
        return Err("Scene file cannot be empty".to_string());
    }

    validate_no_null_bytes(trimmed, "Scene file")?;

    let path = Path::new(trimmed);
    if path.is_absolute() {
        return Err("Scene file must be a relative filename".to_string());
    }

    let mut components = path.components();
    let Some(first) = components.next() else {
        return Err("Scene file cannot be empty".to_string());
    };
    if components.next().is_some() {
        return Err("Scene file cannot contain path separators".to_string());
    }

    if !matches!(first, Component::Normal(_)) {
        return Err("Scene file contains invalid path components".to_string());
    }

    if path.extension().and_then(|e| e.to_str()) != Some("md") {
        return Err("Scene file must end with .md".to_string());
    }

    Ok(())
}

fn default_scene_meta(scene_file: &str, now: i64) -> SceneMeta {
    SceneMeta {
        id: scene_file.replace(".md", ""),
        title: String::new(),
        order: 0,
        status: "draft".to_string(),
        word_count: 0,
        pov_character: None,
        subtitle: None,
        labels: Vec::new(),
        exclude_from_ai: false,
        summary: String::new(),
        archived: false,
        created_at: now,
        updated_at: now,
    }
}

fn parse_scene_document(scene_file: &str, raw: &str) -> Result<(SceneMeta, String), String> {
    let parts: Vec<&str> = raw.splitn(3, "---").collect();
    if parts.len() < 3 {
        return Err("Invalid scene file format".to_string());
    }

    let yaml_str = parts[1].trim();
    let body = parts[2].trim().to_string();
    let now = timestamp::now_millis();

    let yaml_meta: YamlSceneMeta =
        serde_yaml::from_str(yaml_str).map_err(|e| format!("Failed to parse scene YAML: {}", e))?;

    let created_at = chrono::DateTime::parse_from_rfc3339(&yaml_meta.created_at)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(now);
    let updated_at = chrono::DateTime::parse_from_rfc3339(&yaml_meta.updated_at)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(now);

    let id = if yaml_meta.id.is_empty() {
        scene_file.replace(".md", "")
    } else {
        yaml_meta.id
    };

    let title = if yaml_meta.title.is_empty() {
        "Untitled Scene".to_string()
    } else {
        yaml_meta.title
    };

    let mut summary = yaml_meta.summary;
    if summary.trim().is_empty() {
        summary = String::new();
    }

    let mut labels = yaml_meta.labels;
    labels.retain(|label| !label.trim().is_empty());

    let word_count = if yaml_meta.word_count > 0 {
        yaml_meta.word_count
    } else {
        count_words(&body)
    };

    let meta = SceneMeta {
        id,
        title,
        order: yaml_meta.order,
        status: yaml_meta.status,
        word_count,
        pov_character: yaml_meta.pov_character.and_then(|p| {
            if p.trim().is_empty() {
                None
            } else {
                Some(p)
            }
        }),
        subtitle: yaml_meta
            .subtitle
            .and_then(|s| if s.trim().is_empty() { None } else { Some(s) }),
        labels,
        exclude_from_ai: yaml_meta.exclude_from_ai,
        summary,
        archived: yaml_meta.archived,
        created_at,
        updated_at,
    };

    Ok((meta, body))
}

fn build_frontmatter(meta: &SceneMeta) -> String {
    let created_at_str = timestamp::to_rfc3339(meta.created_at);
    let updated_at_str = timestamp::to_rfc3339(meta.updated_at);

    let labels_yaml = if meta.labels.is_empty() {
        "[]".to_string()
    } else {
        serde_json::to_string(&meta.labels).unwrap_or_else(|_| "[]".to_string())
    };

    let subtitle_yaml = match &meta.subtitle {
        Some(v) if !v.trim().is_empty() => format!("\"{}\"", v.replace('"', "\\\"")),
        _ => "null".to_string(),
    };

    let pov_yaml = match &meta.pov_character {
        Some(v) if !v.trim().is_empty() => format!("\"{}\"", v.replace('"', "\\\"")),
        _ => "null".to_string(),
    };

    let summary_yaml = if meta.summary.trim().is_empty() {
        "\"\"".to_string()
    } else {
        format!("\"{}\"", meta.summary.replace('"', "\\\""))
    };

    format!(
        "---\nid: {}\ntitle: \"{}\"\norder: {}\nstatus: {}\nwordCount: {}\npov: {}\nsubtitle: {}\nlabels: {}\nexcludeFromAI: {}\nsummary: {}\narchived: {}\ncreatedAt: {}\nupdatedAt: {}\n---\n\n",
        meta.id,
        meta.title.replace('"', "\\\""),
        meta.order,
        meta.status,
        meta.word_count,
        pov_yaml,
        subtitle_yaml,
        labels_yaml,
        meta.exclude_from_ai,
        summary_yaml,
        meta.archived,
        created_at_str,
        updated_at_str
    )
}

fn load_scene_from_path(scene_file: &str, file_path: &PathBuf) -> Result<Scene, String> {
    if file_path.exists() {
        let metadata = fs::metadata(file_path).map_err(|e| e.to_string())?;
        validate_file_size(metadata.len(), MAX_SCENE_SIZE, "Scene file")?;
    }

    let raw = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let (meta, body) = parse_scene_document(scene_file, &raw)?;
    Ok(Scene {
        meta,
        content: body,
    })
}

fn write_scene_to_path(file_path: &Path, meta: &SceneMeta, content: &str) -> Result<(), String> {
    let frontmatter = build_frontmatter(meta);
    let full_content = frontmatter + content;
    atomic_write(file_path, &full_content)
}

#[tauri::command]
pub fn load_scene(project_path: String, scene_file: String) -> Result<Scene, String> {
    validate_scene_file_name(&scene_file)?;
    let project_path_buf = project_dir(&project_path)?;
    let file_path = project_path_buf.join("manuscript").join(&scene_file);
    load_scene_from_path(&scene_file, &file_path)
}

#[tauri::command]
pub fn save_scene(
    project_path: String,
    scene_file: String,
    content: String,
    title: Option<String>,
    word_count: i32,
) -> Result<SceneMeta, String> {
    validate_scene_file_name(&scene_file)?;
    let file_path = PathBuf::from(&project_path)
        .join("manuscript")
        .join(&scene_file);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let now = timestamp::now_millis();

    let mut meta = if file_path.exists() {
        let raw = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        parse_scene_document(&scene_file, &raw)
            .map(|(m, _)| m)
            .unwrap_or_else(|_| default_scene_meta(&scene_file, now))
    } else {
        default_scene_meta(&scene_file, now)
    };

    if let Some(t) = title {
        meta.title = t;
    } else if meta.title.is_empty() {
        meta.title = "Untitled Scene".to_string();
    }
    meta.word_count = if word_count > 0 {
        word_count
    } else {
        count_words(&content)
    };
    meta.updated_at = now;

    write_scene_to_path(&file_path, &meta, &content)?;
    Ok(meta)
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SceneMetadataUpdates {
    pub title: Option<String>,
    pub status: Option<String>,
    #[serde(default, alias = "povCharacter")]
    pub pov: Option<String>,
    pub subtitle: Option<String>,
    pub labels: Option<Vec<String>>,
    #[serde(default, alias = "excludeFromAi")]
    pub exclude_from_ai: Option<bool>,
    pub summary: Option<String>,
    pub archived: Option<bool>,
}

#[tauri::command]
pub fn update_scene_metadata(
    project_path: String,
    scene_file: String,
    updates: SceneMetadataUpdates,
) -> Result<SceneMeta, String> {
    validate_scene_file_name(&scene_file)?;
    let file_path = PathBuf::from(&project_path)
        .join("manuscript")
        .join(&scene_file);
    let scene = load_scene_from_path(&scene_file, &file_path)?;
    let mut meta = scene.meta;
    let body = scene.content;

    if let Some(title) = updates.title {
        meta.title = title;
    }
    if let Some(status) = updates.status {
        meta.status = status;
    }
    if let Some(pov) = updates.pov {
        let trimmed = pov.trim();
        meta.pov_character = if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        };
    }
    if let Some(subtitle) = updates.subtitle {
        let trimmed = subtitle.trim();
        meta.subtitle = if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        };
    }
    if let Some(labels) = updates.labels {
        meta.labels = labels
            .into_iter()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
    }
    if let Some(exclude) = updates.exclude_from_ai {
        meta.exclude_from_ai = exclude;
    }
    if let Some(summary) = updates.summary {
        meta.summary = summary;
    }
    if let Some(archived) = updates.archived {
        meta.archived = archived;
    }

    meta.word_count = count_words(&body);
    meta.updated_at = timestamp::now_millis();

    write_scene_to_path(&file_path, &meta, &body)?;
    Ok(meta)
}

#[tauri::command]
pub fn delete_scene(project_path: String, scene_file: String) -> Result<(), String> {
    validate_scene_file_name(&scene_file)?;
    let file_path = PathBuf::from(&project_path)
        .join("manuscript")
        .join(&scene_file);
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Save scene by ID - looks up the file path from structure.json
/// This is used by the frontend save coordinator which only has scene ID
#[tauri::command]
pub fn save_scene_by_id(
    project_path: String,
    scene_id: String,
    content: String,
    word_count: i32,
) -> Result<SceneMeta, String> {
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    let structure_content = fs::read_to_string(&structure_path)
        .map_err(|e| format!("Failed to read structure: {}", e))?;

    let structure: Vec<crate::models::StructureNode> = serde_json::from_str(&structure_content)
        .map_err(|e| format!("Failed to parse structure: {}", e))?;

    fn find_scene_file(nodes: &[crate::models::StructureNode], id: &str) -> Option<String> {
        for node in nodes {
            if node.id == id {
                return node.file.clone();
            }
            if !node.children.is_empty() {
                if let Some(file) = find_scene_file(&node.children, id) {
                    return Some(file);
                }
            }
        }
        None
    }

    let scene_file = find_scene_file(&structure, &scene_id)
        .ok_or_else(|| format!("Scene not found in structure: {}", scene_id))?;

    save_scene(project_path, scene_file, content, None, word_count)
}
