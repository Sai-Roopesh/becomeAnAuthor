// Scene commands

use std::fs;
use std::path::PathBuf;

use crate::models::{Scene, SceneMeta, YamlSceneMeta};
use crate::utils::{project_dir, validate_file_size, count_words, MAX_SCENE_SIZE, timestamp};

#[tauri::command]
pub fn load_scene(project_path: String, scene_file: String) -> Result<Scene, String> {
    // Get the project directory (no validation needed as paths are from frontend)
    let project_path_buf = project_dir(&project_path)?;
    
    let file_path = project_path_buf.join("manuscript").join(&scene_file);
    
    // Security: Check file size before loading
    if file_path.exists() {
        let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;
        validate_file_size(metadata.len(), MAX_SCENE_SIZE, "Scene file")?;
    }
    
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    
    // Parse YAML frontmatter
    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() < 3 {
        return Err("Invalid scene file format".to_string());
    }
    
    let yaml_str = parts[1].trim();
    let body = parts[2].trim();
    
    // Use serde_yaml for proper parsing
    let yaml_meta: YamlSceneMeta = serde_yaml::from_str(yaml_str)
        .map_err(|e| format!("Failed to parse scene YAML: {}", e))?;
    
    // Convert string timestamps to i64
    let created_at = chrono::DateTime::parse_from_rfc3339(&yaml_meta.created_at)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or_else(|_| timestamp::now_millis());
    let updated_at = chrono::DateTime::parse_from_rfc3339(&yaml_meta.updated_at)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or_else(|_| timestamp::now_millis());
    
    let meta = SceneMeta {
        id: yaml_meta.id,
        title: yaml_meta.title,
        order: yaml_meta.order,
        status: yaml_meta.status,
        word_count: count_words(body),
        pov_character: yaml_meta.pov_character,
        created_at,
        updated_at,
    };
    
    Ok(Scene {
        meta,
        content: body.to_string(),
    })
}

#[tauri::command]
pub fn save_scene(project_path: String, scene_file: String, content: String, title: Option<String>, word_count: i32) -> Result<SceneMeta, String> {
    let file_path = PathBuf::from(&project_path).join("manuscript").join(&scene_file);
    
    // Load existing scene to preserve metadata
    let existing = fs::read_to_string(&file_path).ok();
    let now = timestamp::now_millis();
    
    let mut meta = if let Some(existing_content) = existing {
        let parts: Vec<&str> = existing_content.splitn(3, "---").collect();
        if parts.len() >= 2 {
            // Parse existing YAML
            let yaml_str = parts[1].trim();
            let mut m = SceneMeta {
                id: String::new(),
                title: String::new(),
                order: 0,
                status: "draft".to_string(),
                word_count: 0,
                pov_character: None,
                created_at: now,
                updated_at: now,
            };
            for line in yaml_str.lines() {
                let parts: Vec<&str> = line.splitn(2, ':').collect();
                if parts.len() == 2 {
                    let key = parts[0].trim();
                    let value = parts[1].trim().trim_matches('"');
                    match key {
                        "id" => m.id = value.to_string(),
                        "title" => m.title = value.to_string(),
                        "order" => m.order = value.parse().unwrap_or(0),
                        "status" => m.status = value.to_string(),
                        "povCharacter" => m.pov_character = Some(value.to_string()),
                        "createdAt" => {
                            m.created_at = chrono::DateTime::parse_from_rfc3339(value)
                                .map(|dt| dt.timestamp_millis())
                                .unwrap_or(now);
                        }
                        _ => {}
                    }
                }
            }
            m
        } else {
            SceneMeta {
                id: scene_file.replace(".md", ""),
                title: title.clone().unwrap_or_default(),
                order: 0,
                status: "draft".to_string(),
                word_count: 0,
                pov_character: None,
                created_at: now,
                updated_at: now,
            }
        }
    } else {
        SceneMeta {
            id: scene_file.replace(".md", ""),
            title: title.clone().unwrap_or_default(),
            order: 0,
            status: "draft".to_string(),
            word_count: 0,
            pov_character: None,
            created_at: now,
            updated_at: now,
        }
    };
    
    meta.word_count = word_count;
    meta.updated_at = now;
    if let Some(t) = title {
        meta.title = t;
    }
    
    // Convert timestamps to RFC3339 strings for YAML frontmatter
    let created_at_str = timestamp::to_rfc3339(meta.created_at);
    let updated_at_str = timestamp::to_rfc3339(meta.updated_at);
    
    let frontmatter = format!(
        "---\nid: {}\ntitle: \"{}\"\norder: {}\nstatus: {}\nwordCount: {}\ncreatedAt: {}\nupdatedAt: {}\n---\n\n",
        meta.id, meta.title, meta.order, meta.status, meta.word_count, created_at_str, updated_at_str
    );
    
    let full_content = frontmatter + &content;
    
    // Atomic write
    let temp_path = file_path.with_extension("md.tmp");
    fs::write(&temp_path, &full_content).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &file_path).map_err(|e| e.to_string())?;
    
    Ok(meta)
}

#[tauri::command]
pub fn delete_scene(project_path: String, scene_file: String) -> Result<(), String> {
    let file_path = PathBuf::from(&project_path).join("manuscript").join(&scene_file);
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Save scene by ID - looks up the file path from structure.json
/// This is used by the frontend save coordinator which only has scene ID
#[tauri::command]
pub fn save_scene_by_id(project_path: String, scene_id: String, content: String, word_count: i32) -> Result<SceneMeta, String> {
    // Load structure to find the scene file
    let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
    let structure_content = fs::read_to_string(&structure_path)
        .map_err(|e| format!("Failed to read structure: {}", e))?;
    
    let structure: Vec<crate::models::StructureNode> = serde_json::from_str(&structure_content)
        .map_err(|e| format!("Failed to parse structure: {}", e))?;
    
    // Find scene file by ID (recursive search)
    fn find_scene_file(nodes: &[crate::models::StructureNode], id: &str) -> Option<String> {
        for node in nodes {
            if node.id == id {
                return node.file.clone();
            }
            // children is Vec, not Option - iterate directly
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
    
    // Call existing save_scene with the resolved file path
    save_scene(project_path, scene_file, content, None, word_count)
}

