// I/O utilities

use std::fs;

/// Atomic write: writes to a temporary file first, then renames to target
/// Prevents data corruption on crash/power loss
pub fn atomic_write(path: &std::path::Path, content: &str) -> Result<(), String> {
    let temp_path = path.with_extension("tmp");
    
    // Write to temp file
    fs::write(&temp_path, content)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    
    // Atomically rename to target
    fs::rename(&temp_path, path)
        .map_err(|e| format!("Failed to rename file: {}", e))?;
    
    Ok(())
}
