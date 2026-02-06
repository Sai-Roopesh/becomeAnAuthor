// Chat commands

use std::fs;
use std::path::PathBuf;

use crate::models::{ChatThread, ChatMessage};
use crate::utils::{validate_no_null_bytes, validate_json_size};

#[tauri::command]
pub fn list_chat_threads(project_path: String) -> Result<Vec<ChatThread>, String> {
    let threads_path = PathBuf::from(&project_path).join(".meta/chat/threads.json");
    if !threads_path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&threads_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chat_thread(project_path: String, thread_id: String) -> Result<Option<ChatThread>, String> {
    let threads = list_chat_threads(project_path)?;
    Ok(threads.into_iter().find(|t| t.id == thread_id))
}

#[tauri::command]
pub fn create_chat_thread(project_path: String, thread: ChatThread) -> Result<ChatThread, String> {
    // Validate thread name
    validate_no_null_bytes(&thread.name, "Thread name")?;
    
    let threads_path = PathBuf::from(&project_path).join(".meta/chat/threads.json");
    // Create parent directory if needed
    if let Some(parent) = threads_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    // Read existing threads directly to avoid cloning project_path
    let mut threads: Vec<ChatThread> = if threads_path.exists() {
        let content = fs::read_to_string(&threads_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    let result = thread.clone();
    threads.push(thread);
    
    let json = serde_json::to_string_pretty(&threads).map_err(|e| e.to_string())?;
    fs::write(&threads_path, json).map_err(|e| e.to_string())?;
    
    Ok(result)
}

#[tauri::command]
pub fn update_chat_thread(project_path: String, thread: ChatThread) -> Result<(), String> {
    let threads_path = PathBuf::from(&project_path).join(".meta/chat/threads.json");
    // Read existing threads directly to avoid cloning project_path
    let mut threads: Vec<ChatThread> = if threads_path.exists() {
        let content = fs::read_to_string(&threads_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    if let Some(idx) = threads.iter().position(|t| t.id == thread.id) {
        threads[idx] = thread;
    }
    
    let json = serde_json::to_string_pretty(&threads).map_err(|e| e.to_string())?;
    fs::write(&threads_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_chat_thread(project_path: String, thread_id: String) -> Result<(), String> {
    let threads_path = PathBuf::from(&project_path).join(".meta/chat/threads.json");
    // Read existing threads directly to avoid cloning project_path
    let mut threads: Vec<ChatThread> = if threads_path.exists() {
        let content = fs::read_to_string(&threads_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    threads.retain(|t| t.id != thread_id);
    
    let json = serde_json::to_string_pretty(&threads).map_err(|e| e.to_string())?;
    fs::write(&threads_path, json).map_err(|e| e.to_string())?;
    
    // Also delete thread messages
    let messages_path = PathBuf::from(&project_path).join(".meta/chat/messages").join(format!("{}.json", thread_id));
    if messages_path.exists() {
        let _ = fs::remove_file(&messages_path);
    }
    
    Ok(())
}

#[tauri::command]
pub fn get_chat_messages(project_path: String, thread_id: String) -> Result<Vec<ChatMessage>, String> {
    let messages_path = PathBuf::from(&project_path).join(".meta/chat/messages").join(format!("{}.json", thread_id));
    if !messages_path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&messages_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_chat_message(project_path: String, message: ChatMessage) -> Result<ChatMessage, String> {
    // Validate message content
    validate_no_null_bytes(&message.content, "Message content")?;
    validate_json_size(&message.content)?;
    
    let messages_dir = PathBuf::from(&project_path).join(".meta/chat/messages");
    fs::create_dir_all(&messages_dir).map_err(|e| e.to_string())?;
    
    let messages_path = messages_dir.join(format!("{}.json", message.thread_id));
    let mut messages = if messages_path.exists() {
        let content = fs::read_to_string(&messages_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    messages.push(message.clone());
    
    let json = serde_json::to_string_pretty(&messages).map_err(|e| e.to_string())?;
    fs::write(&messages_path, json).map_err(|e| e.to_string())?;
    
    Ok(message)
}

#[tauri::command]
pub fn delete_chat_message(project_path: String, thread_id: String, message_id: String) -> Result<(), String> {
    let messages_path = PathBuf::from(&project_path).join(".meta/chat/messages").join(format!("{}.json", thread_id));
    if !messages_path.exists() {
        return Ok(());
    }
    
    let content = fs::read_to_string(&messages_path).map_err(|e| e.to_string())?;
    let mut messages: Vec<ChatMessage> = serde_json::from_str(&content).unwrap_or_default();
    messages.retain(|m| m.id != message_id);
    
    let json = serde_json::to_string_pretty(&messages).map_err(|e| e.to_string())?;
    fs::write(&messages_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}
