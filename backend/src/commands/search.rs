// Search commands

use std::fs;
use std::path::PathBuf;

use walkdir::WalkDir;

use crate::models::{ProjectMeta, StructureNode};
use crate::utils::get_series_codex_path;

fn strip_frontmatter(content: &str) -> String {
    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() >= 3 {
        parts[2].trim().to_string()
    } else {
        content.to_string()
    }
}

fn extract_snippet(content: &str, query_lower: &str) -> String {
    let normalized = content.replace('\n', " ");
    let lowered = normalized.to_lowercase();
    let Some(hit_index) = lowered.find(query_lower) else {
        return normalized.chars().take(180).collect::<String>();
    };

    let start = hit_index.saturating_sub(80);
    let end = (hit_index + query_lower.len() + 80).min(normalized.len());

    if let Some(window) = normalized.get(start..end) {
        return window.trim().to_string();
    }

    normalized.chars().take(180).collect::<String>()
}

fn collect_scene_nodes(nodes: &[StructureNode], out: &mut Vec<(String, String, String)>) {
    for node in nodes {
        if node.node_type == "scene" {
            if let Some(file) = &node.file {
                out.push((node.id.clone(), node.title.clone(), file.clone()));
            }
        }
        collect_scene_nodes(&node.children, out);
    }
}

#[tauri::command]
pub fn search_project(
    project_path: String,
    query: String,
    scope: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    let mut results = Vec::new();
    let query_trimmed = query.trim();
    if query_trimmed.is_empty() {
        return Ok(results);
    }

    let query_lower = query_trimmed.to_lowercase();
    let scope = scope.unwrap_or_else(|| "all".to_string());
    let search_scenes = scope == "all" || scope == "scenes";
    let search_codex = scope == "all" || scope == "codex";

    if search_scenes {
        let structure_path = PathBuf::from(&project_path).join(".meta/structure.json");
        let structure_content = fs::read_to_string(&structure_path).unwrap_or_else(|_| "[]".to_string());
        let structure: Vec<StructureNode> = serde_json::from_str(&structure_content).unwrap_or_default();

        let mut scene_nodes = Vec::new();
        collect_scene_nodes(&structure, &mut scene_nodes);

        for (scene_id, scene_title, scene_file) in scene_nodes {
            let path = PathBuf::from(&project_path).join("manuscript").join(&scene_file);
            let Ok(raw) = fs::read_to_string(&path) else {
                continue;
            };

            let searchable = format!("{}\n{}", scene_title, raw);
            let searchable_lower = searchable.to_lowercase();
            if !searchable_lower.contains(&query_lower) {
                continue;
            }

            let body = strip_frontmatter(&raw);
            let snippet = if body.to_lowercase().contains(&query_lower) {
                extract_snippet(&body, &query_lower)
            } else {
                extract_snippet(&scene_title, &query_lower)
            };

            let score =
                if scene_title.to_lowercase().contains(&query_lower) { 2.0 } else { 0.0 } +
                if body.to_lowercase().contains(&query_lower) { 1.0 } else { 0.0 };

            results.push(serde_json::json!({
                "id": scene_id,
                "title": scene_title,
                "type": "scene",
                "contentType": "scene",
                "snippet": snippet,
                "score": score,
                "path": path.to_string_lossy().to_string(),
            }));
        }
    }

    if search_codex {
        let codex_dir = {
            let meta_path = PathBuf::from(&project_path).join(".meta/project.json");
            if let Ok(content) = fs::read_to_string(meta_path) {
                if let Ok(project_meta) = serde_json::from_str::<ProjectMeta>(&content) {
                    get_series_codex_path(&project_meta.series_id)
                        .unwrap_or_else(|_| PathBuf::from(&project_path).join(".meta/codex"))
                } else {
                    PathBuf::from(&project_path).join(".meta/codex")
                }
            } else {
                PathBuf::from(&project_path).join(".meta/codex")
            }
        };

        if codex_dir.exists() {
            for entry in WalkDir::new(&codex_dir).min_depth(2).max_depth(2).into_iter().flatten() {
                let path = entry.path();
                if !path.extension().is_some_and(|e| e == "json") {
                    continue;
                }

                let Ok(raw) = fs::read_to_string(path) else {
                    continue;
                };

                let raw_lower = raw.to_lowercase();
                if !raw_lower.contains(&query_lower) {
                    continue;
                }

                let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
                let entry_id = parsed
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(ToString::to_string)
                    .unwrap_or_else(|| {
                        path.file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("unknown")
                            .to_string()
                    });
                let entry_title = parsed
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Untitled Codex Entry")
                    .to_string();
                let category = parsed
                    .get("category")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                let description = parsed
                    .get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                let snippet_source = if description.is_empty() { &raw } else { description };
                let snippet = extract_snippet(snippet_source, &query_lower);

                let score =
                    if entry_title.to_lowercase().contains(&query_lower) { 2.0 } else { 0.0 } +
                    if description.to_lowercase().contains(&query_lower) { 1.0 } else { 0.5 };

                results.push(serde_json::json!({
                    "id": entry_id,
                    "title": entry_title,
                    "type": "codex",
                    "contentType": "codex",
                    "category": category,
                    "snippet": snippet,
                    "score": score,
                    "path": path.to_string_lossy().to_string(),
                }));
            }
        }
    }

    results.sort_by(|a, b| {
        let a_score = a.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let b_score = b.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);

        b_score
            .partial_cmp(&a_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| {
                let a_title = a.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let b_title = b.get("title").and_then(|v| v.as_str()).unwrap_or("");
                a_title.cmp(b_title)
            })
    });

    Ok(results)
}
