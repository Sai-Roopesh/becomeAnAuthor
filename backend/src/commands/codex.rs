// Codex commands (SQLite-backed)

use rusqlite::{params, Connection};

use crate::models::{
    CodexEntry, CodexEntryTag, CodexRelation, CodexRelationType, CodexTag, CodexTemplate,
    SceneCodexLink,
};
use crate::storage::open_app_db;

fn project_series_id(conn: &Connection, project_path: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT series_id FROM projects WHERE path = ?1",
        params![project_path],
        |row| row.get::<_, String>(0),
    )
    .map_err(|e| format!("Failed to resolve project series_id: {e}"))
}

fn parse_payload<T: for<'de> serde::Deserialize<'de>>(
    payload: String,
    label: &str,
) -> Result<T, String> {
    serde_json::from_str::<T>(&payload)
        .map_err(|e| format!("Failed to parse {} payload: {e}", label))
}

fn list_payloads<T: for<'de> serde::Deserialize<'de>>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn rusqlite::ToSql],
    label: &str,
) -> Result<Vec<T>, String> {
    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| format!("Failed to prepare {} list query: {e}", label))?;
    let rows = stmt
        .query_map(params, |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to execute {} list query: {e}", label))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(parse_payload::<T>(
            row.map_err(|e| format!("Failed to decode {} payload row: {e}", label))?,
            label,
        )?);
    }
    Ok(result)
}

#[tauri::command]
pub fn list_codex_entries(project_path: String) -> Result<Vec<CodexEntry>, String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    list_payloads::<CodexEntry>(
        &conn,
        "SELECT payload_json FROM codex_entries WHERE series_id = ?1 ORDER BY updated_at DESC",
        &[&series_id],
        "codex entry",
    )
}

#[tauri::command]
pub fn save_codex_entry(project_path: String, entry: CodexEntry) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    let payload_json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    let aliases_json = serde_json::to_string(&entry.aliases).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_entries(id, series_id, category, name, aliases_json, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            category = excluded.category,
            name = excluded.name,
            aliases_json = excluded.aliases_json,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            entry.id,
            series_id,
            entry.category,
            entry.name,
            aliases_json,
            payload_json,
            entry.created_at,
            entry.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to save codex entry: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn delete_codex_entry(
    project_path: String,
    _category: String,
    entry_id: String,
) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM codex_entries WHERE series_id = ?1 AND id = ?2",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete codex entry: {e}"))?;
    conn.execute(
        "DELETE FROM codex_relations WHERE series_id = ?1 AND (parent_id = ?2 OR child_id = ?2)",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete dependent codex relations: {e}"))?;
    conn.execute(
        "DELETE FROM scene_codex_links WHERE series_id = ?1 AND codex_id = ?2",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete dependent scene links: {e}"))?;
    conn.execute(
        "DELETE FROM codex_entry_tags WHERE series_id = ?1 AND entry_id = ?2",
        params![series_id, entry_id],
    )
    .map_err(|e| format!("Failed to delete dependent codex entry tags: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn list_codex_relations(project_path: String) -> Result<Vec<CodexRelation>, String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    list_payloads::<CodexRelation>(
        &conn,
        "SELECT payload_json FROM codex_relations WHERE series_id = ?1 ORDER BY updated_at DESC",
        &[&series_id],
        "codex relation",
    )
}

#[tauri::command]
pub fn save_codex_relation(project_path: String, relation: CodexRelation) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    let payload_json = serde_json::to_string(&relation).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_relations(id, series_id, parent_id, child_id, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            parent_id = excluded.parent_id,
            child_id = excluded.child_id,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            relation.id,
            series_id,
            relation.parent_id,
            relation.child_id,
            payload_json,
            relation.created_at,
            relation.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to save codex relation: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_relation(project_path: String, relation_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM codex_relations WHERE series_id = ?1 AND id = ?2",
        params![series_id, relation_id],
    )
    .map_err(|e| format!("Failed to delete codex relation: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn list_codex_tags(project_path: String) -> Result<Vec<CodexTag>, String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    list_payloads::<CodexTag>(
        &conn,
        "SELECT payload_json FROM codex_tags WHERE series_id = ?1 ORDER BY updated_at DESC",
        &[&series_id],
        "codex tag",
    )
}

#[tauri::command]
pub fn save_codex_tag(project_path: String, tag: CodexTag) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    let payload_json = serde_json::to_string(&tag).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_tags(id, series_id, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            tag.id,
            series_id,
            payload_json,
            tag.created_at,
            tag.updated_at
        ],
    )
    .map_err(|e| format!("Failed to save codex tag: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_tag(project_path: String, tag_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM codex_tags WHERE series_id = ?1 AND id = ?2",
        params![series_id, tag_id],
    )
    .map_err(|e| format!("Failed to delete codex tag: {e}"))?;
    conn.execute(
        "DELETE FROM codex_entry_tags WHERE series_id = ?1 AND tag_id = ?2",
        params![series_id, tag_id],
    )
    .map_err(|e| format!("Failed to delete dependent codex entry tags: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn list_codex_entry_tags(project_path: String) -> Result<Vec<CodexEntryTag>, String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    list_payloads::<CodexEntryTag>(
        &conn,
        "SELECT payload_json FROM codex_entry_tags WHERE series_id = ?1 ORDER BY id ASC",
        &[&series_id],
        "codex entry tag",
    )
}

#[tauri::command]
pub fn save_codex_entry_tag(project_path: String, entry_tag: CodexEntryTag) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    let payload_json = serde_json::to_string(&entry_tag).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_entry_tags(id, series_id, entry_id, tag_id, payload_json)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            entry_id = excluded.entry_id,
            tag_id = excluded.tag_id,
            payload_json = excluded.payload_json
        "#,
        params![
            entry_tag.id,
            series_id,
            entry_tag.entry_id,
            entry_tag.tag_id,
            payload_json,
        ],
    )
    .map_err(|e| format!("Failed to save codex entry tag: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_entry_tag(project_path: String, entry_tag_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM codex_entry_tags WHERE series_id = ?1 AND id = ?2",
        params![series_id, entry_tag_id],
    )
    .map_err(|e| format!("Failed to delete codex entry tag: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn list_codex_templates(project_path: String) -> Result<Vec<CodexTemplate>, String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    list_payloads::<CodexTemplate>(
        &conn,
        "SELECT payload_json FROM codex_templates WHERE series_id = ?1 ORDER BY created_at DESC",
        &[&series_id],
        "codex template",
    )
}

#[tauri::command]
pub fn save_codex_template(project_path: String, template: CodexTemplate) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    let payload_json = serde_json::to_string(&template).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_templates(id, series_id, payload_json, created_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            payload_json = excluded.payload_json,
            created_at = excluded.created_at
        "#,
        params![template.id, series_id, payload_json, template.created_at],
    )
    .map_err(|e| format!("Failed to save codex template: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_template(project_path: String, template_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM codex_templates WHERE series_id = ?1 AND id = ?2",
        params![series_id, template_id],
    )
    .map_err(|e| format!("Failed to delete codex template: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn list_codex_relation_types(project_path: String) -> Result<Vec<CodexRelationType>, String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    list_payloads::<CodexRelationType>(
        &conn,
        "SELECT payload_json FROM codex_relation_types WHERE series_id = ?1 ORDER BY id ASC",
        &[&series_id],
        "codex relation type",
    )
}

#[tauri::command]
pub fn save_codex_relation_type(
    project_path: String,
    rel_type: CodexRelationType,
) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    let payload_json = serde_json::to_string(&rel_type).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO codex_relation_types(id, series_id, payload_json)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            payload_json = excluded.payload_json
        "#,
        params![rel_type.id, series_id, payload_json],
    )
    .map_err(|e| format!("Failed to save codex relation type: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_codex_relation_type(project_path: String, type_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM codex_relation_types WHERE series_id = ?1 AND id = ?2",
        params![series_id, type_id],
    )
    .map_err(|e| format!("Failed to delete codex relation type: {e}"))?;

    let relations = list_codex_relations(project_path.clone())?;
    for relation in relations
        .into_iter()
        .filter(|relation| relation.type_id.as_deref() == Some(type_id.as_str()))
    {
        conn.execute(
            "DELETE FROM codex_relations WHERE series_id = ?1 AND id = ?2",
            params![series_id, relation.id],
        )
        .map_err(|e| format!("Failed to prune relation after relation type delete: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
pub fn list_scene_codex_links(project_path: String) -> Result<Vec<SceneCodexLink>, String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    list_payloads::<SceneCodexLink>(
        &conn,
        "SELECT payload_json FROM scene_codex_links WHERE series_id = ?1 ORDER BY updated_at DESC",
        &[&series_id],
        "scene codex link",
    )
}

#[tauri::command]
pub fn save_scene_codex_link(project_path: String, link: SceneCodexLink) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;
    let payload_json = serde_json::to_string(&link).map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO scene_codex_links(id, series_id, scene_id, codex_id, payload_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            series_id = excluded.series_id,
            scene_id = excluded.scene_id,
            codex_id = excluded.codex_id,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        "#,
        params![
            link.id,
            series_id,
            link.scene_id,
            link.codex_id,
            payload_json,
            link.created_at,
            link.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to save scene codex link: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_scene_codex_link(project_path: String, link_id: String) -> Result<(), String> {
    let conn = open_app_db()?;
    let series_id = project_series_id(&conn, &project_path)?;

    conn.execute(
        "DELETE FROM scene_codex_links WHERE series_id = ?1 AND id = ?2",
        params![series_id, link_id],
    )
    .map_err(|e| format!("Failed to delete scene codex link: {e}"))?;

    Ok(())
}
