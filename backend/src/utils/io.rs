// I/O utilities

use serde::Serialize;
use serde::de::DeserializeOwned;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0)
}

/// Atomic write with durability best-effort:
/// 1) writes to a temporary file in the same directory
/// 2) fsyncs the file
/// 3) renames into place
/// 4) fsyncs the parent directory (where supported)
pub fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid target path: {}", path.display()))?;
    fs::create_dir_all(parent).map_err(|e| {
        format!(
            "Failed to create parent directory '{}' for atomic write: {}",
            parent.display(),
            e
        )
    })?;

    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("Invalid file name for path: {}", path.display()))?;
    let temp_name = format!(".{}.{}.tmp", file_name, now_nanos());
    let temp_path = parent.join(temp_name);

    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp_path)
        .map_err(|e| format!("Failed to create temp file '{}': {}", temp_path.display(), e))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write temp file '{}': {}", temp_path.display(), e))?;
    file.sync_all()
        .map_err(|e| format!("Failed to sync temp file '{}': {}", temp_path.display(), e))?;
    drop(file);

    fs::rename(&temp_path, path).map_err(|e| {
        format!(
            "Failed to rename temp file '{}' to '{}': {}",
            temp_path.display(),
            path.display(),
            e
        )
    })?;

    if let Ok(parent_handle) = File::open(parent) {
        let _ = parent_handle.sync_all();
    }

    Ok(())
}

pub fn read_json_file<T>(path: &Path, label: &str) -> Result<T, String>
where
    T: DeserializeOwned,
{
    let content = fs::read_to_string(path).map_err(|e| {
        format!(
            "Failed to read {} at '{}': {}",
            label,
            path.display(),
            e
        )
    })?;
    serde_json::from_str::<T>(&content).map_err(|e| {
        format!(
            "Failed to parse {} JSON at '{}': {}",
            label,
            path.display(),
            e
        )
    })
}

pub fn read_json_file_if_exists<T>(path: &Path, label: &str) -> Result<Vec<T>, String>
where
    T: DeserializeOwned,
{
    if !path.exists() {
        return Ok(Vec::new());
    }
    read_json_file(path, label)
}

pub fn write_json_file<T>(path: &Path, value: &T, label: &str) -> Result<(), String>
where
    T: Serialize + ?Sized,
{
    let json = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Failed to serialize {}: {}", label, e))?;
    atomic_write(path, &json)
}
