// Analysis commands

use std::fs;
use std::path::PathBuf;

use crate::models::Analysis;

#[tauri::command]
pub fn list_analyses(project_path: String) -> Result<Vec<Analysis>, String> {
    let analyses_dir = PathBuf::from(&project_path).join("analyses");
    let mut analyses = Vec::new();
    
    if !analyses_dir.exists() {
        return Ok(analyses);
    }
    
    for entry in (fs::read_dir(&analyses_dir).map_err(|e| e.to_string())?).flatten() {
        if entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(analysis) = serde_json::from_str::<Analysis>(&content) {
                    analyses.push(analysis);
                }
            }
        }
    }
    
    Ok(analyses)
}

#[tauri::command]
pub fn save_analysis(project_path: String, analysis: Analysis) -> Result<(), String> {
    let analyses_dir = PathBuf::from(&project_path).join("analyses");
    fs::create_dir_all(&analyses_dir).map_err(|e| e.to_string())?;
    
    let analysis_path = analyses_dir.join(format!("{}.json", analysis.id));
    let json = serde_json::to_string_pretty(&analysis).map_err(|e| e.to_string())?;
    fs::write(&analysis_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_analysis(project_path: String, analysis_id: String) -> Result<(), String> {
    let analysis_path = PathBuf::from(&project_path).join("analyses").join(format!("{}.json", analysis_id));
    
    if analysis_path.exists() {
        fs::remove_file(&analysis_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
