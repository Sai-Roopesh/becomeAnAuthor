// Path utilities

use std::fs;
use std::path::PathBuf;

/// Get the application root directory
pub fn get_app_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_dir = home.join("BecomeAnAuthor");
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    Ok(app_dir)
}

/// Get the projects directory
pub fn get_projects_dir() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let projects_dir = app_dir.join("Projects");
    fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
    Ok(projects_dir)
}

/// Get the series storage path (series.json metadata file)
pub fn get_series_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let series_path = app_dir.join(".meta").join("series.json");
    fs::create_dir_all(app_dir.join(".meta")).map_err(|e| e.to_string())?;
    Ok(series_path)
}

/// Resolve a project directory path from a project path string
/// This is a helper that combines get_projects_dir with the project path
pub fn project_dir(project_path: &str) -> Result<PathBuf, String> {
    let projects_dir = get_projects_dir()?;
    Ok(projects_dir.join(project_path))
}

/// Get the directory for a specific series
pub fn get_series_dir(series_id: &str) -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    let series_dir = app_dir.join("series").join(series_id);
    fs::create_dir_all(&series_dir).map_err(|e| e.to_string())?;
    Ok(series_dir)
}

/// Get the codex directory for a specific series
pub fn get_series_codex_path(series_id: &str) -> Result<PathBuf, String> {
    let series_dir = get_series_dir(series_id)?;
    let codex_dir = series_dir.join("codex");
    fs::create_dir_all(&codex_dir).map_err(|e| e.to_string())?;
    Ok(codex_dir)
}
