// Map commands

use std::fs;
use std::path::PathBuf;
use crate::models::ProjectMap;

#[tauri::command]
pub fn list_maps(project_path: String) -> Result<Vec<ProjectMap>, String> {
    let maps_dir = PathBuf::from(&project_path).join("maps");
    let mut maps = Vec::new();
    
    if !maps_dir.exists() {
        return Ok(maps);
    }
    
    for entry in (fs::read_dir(&maps_dir).map_err(|e| e.to_string())?).flatten() {
        if entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(map) = serde_json::from_str::<ProjectMap>(&content) {
                    maps.push(map);
                }
            }
        }
    }
    
    Ok(maps)
}

#[tauri::command]
pub fn save_map(project_path: String, map: ProjectMap) -> Result<(), String> {
    let maps_dir = PathBuf::from(&project_path).join("maps");
    fs::create_dir_all(&maps_dir).map_err(|e| e.to_string())?;
    
    let map_path = maps_dir.join(format!("{}.json", map.id));
    let json = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;
    fs::write(&map_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_map(project_path: String, map_id: String) -> Result<(), String> {
    let map_path = PathBuf::from(&project_path).join("maps").join(format!("{}.json", map_id));
    
    if map_path.exists() {
        // Also try to delete associated image if it's in the maps/images dir
        if let Ok(content) = fs::read_to_string(&map_path) {
            if let Ok(map) = serde_json::from_str::<ProjectMap>(&content) {
                let img_path = PathBuf::from(&project_path).join(&map.image_path);
                if img_path.exists() {
                    let _ = fs::remove_file(img_path);
                }
            }
        }
        fs::remove_file(&map_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn upload_map_image(
    project_path: String,
    map_id: String,
    image_data: Vec<u8>,
    file_name: String
) -> Result<String, String> {
    let images_dir = PathBuf::from(&project_path).join("maps").join("images");
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    
    let path = PathBuf::from(&file_name);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    
    let image_file_name = format!("{}.{}", map_id, extension);
    let image_path = images_dir.join(&image_file_name);
    
    fs::write(&image_path, image_data).map_err(|e| e.to_string())?;
    
    // Return relative path from project root
    Ok(format!("maps/images/{}", image_file_name))
}
