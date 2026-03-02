use std::fs;
use std::path::PathBuf;

use crate::models::StructureNode;

fn extract_scene_body(content: &str) -> &str {
    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() >= 3 {
        parts[2].trim()
    } else {
        content.trim()
    }
}

#[tauri::command]
pub fn export_manuscript_text(project_path: String) -> Result<String, String> {
    let structure = crate::commands::project::get_structure(project_path.clone())?;
    let mut output = String::new();

    fn process_node(node: &StructureNode, project_path: &str, output: &mut String, depth: usize) {
        let indent = "  ".repeat(depth);

        match node.node_type.as_str() {
            "act" => {
                output.push_str(&format!("\n{}# {}\n\n", indent, node.title));
            }
            "chapter" => {
                output.push_str(&format!("\n{}## {}\n\n", indent, node.title));
            }
            "scene" => {
                output.push_str(&format!("{}### {}\n\n", indent, node.title));
                if let Some(file) = &node.file {
                    let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        output.push_str(extract_scene_body(&content));
                        output.push_str("\n\n");
                    }
                }
            }
            _ => {}
        }

        for child in &node.children {
            process_node(child, project_path, output, depth + 1);
        }
    }

    for node in &structure {
        process_node(node, &project_path, &mut output, 0);
    }

    Ok(output)
}

fn extract_text_from_tiptap(content: &serde_json::Value) -> String {
    let mut result = String::new();

    if let Some(content_array) = content.get("content").and_then(|c| c.as_array()) {
        for node in content_array {
            extract_text_recursive(node, &mut result);
        }
    }

    result
}

fn extract_text_recursive(node: &serde_json::Value, result: &mut String) {
    if let Some(text) = node.get("text").and_then(|t| t.as_str()) {
        result.push_str(text);
    }

    if let Some(node_type) = node.get("type").and_then(|t| t.as_str()) {
        if node_type == "paragraph" {
            if let Some(content) = node.get("content").and_then(|c| c.as_array()) {
                for child in content {
                    extract_text_recursive(child, result);
                }
            }
            result.push_str("\n\n");
            return;
        }
    }

    if let Some(content) = node.get("content").and_then(|c| c.as_array()) {
        for child in content {
            extract_text_recursive(child, result);
        }
    }
}

#[tauri::command]
pub fn export_manuscript_docx(project_path: String, output_path: String) -> Result<String, String> {
    use docx_rs::*;

    let structure = crate::commands::project::get_structure(project_path.clone())?;
    let mut docx = Docx::new();

    fn add_node_to_docx(node: &StructureNode, docx: &mut Docx, project_path: &str) {
        match node.node_type.as_str() {
            "act" => {
                *docx = std::mem::take(docx).add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(&node.title).bold())
                        .style("Heading1"),
                );
            }
            "chapter" => {
                *docx = std::mem::take(docx).add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(&node.title).bold())
                        .style("Heading2"),
                );
            }
            "scene" => {
                *docx = std::mem::take(docx).add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(&node.title).bold())
                        .style("Heading3"),
                );

                if let Some(file) = &node.file {
                    let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        let body = extract_scene_body(&content);

                        if let Ok(tiptap) = serde_json::from_str::<serde_json::Value>(body) {
                            let text = extract_text_from_tiptap(&tiptap);
                            for para in text.split("\n\n").filter(|s| !s.trim().is_empty()) {
                                *docx = std::mem::take(docx).add_paragraph(
                                    Paragraph::new().add_run(Run::new().add_text(para.trim())),
                                );
                            }
                        } else {
                            for para in body.split("\n\n").filter(|s| !s.trim().is_empty()) {
                                *docx = std::mem::take(docx).add_paragraph(
                                    Paragraph::new().add_run(Run::new().add_text(para.trim())),
                                );
                            }
                        }
                    }
                }
            }
            _ => {}
        }

        for child in &node.children {
            add_node_to_docx(child, docx, project_path);
        }
    }

    for node in &structure {
        add_node_to_docx(node, &mut docx, &project_path);
    }

    let file =
        fs::File::create(&output_path).map_err(|e| format!("Failed to create file: {}", e))?;

    docx.build()
        .pack(file)
        .map_err(|e| format!("Failed to build DOCX: {}", e))?;

    Ok(output_path)
}

#[tauri::command]
pub fn export_manuscript_epub(
    project_path: String,
    output_path: String,
    title: Option<String>,
    author: Option<String>,
    language: Option<String>,
) -> Result<String, String> {
    use epub_builder::{EpubBuilder, EpubContent, ZipLibrary};

    let structure = crate::commands::project::get_structure(project_path.clone())?;

    let mut epub = EpubBuilder::new(ZipLibrary::new().map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;

    epub.metadata("title", title.as_deref().unwrap_or("Untitled"))
        .map_err(|e| e.to_string())?;
    epub.metadata("author", author.as_deref().unwrap_or("Unknown"))
        .map_err(|e| e.to_string())?;
    epub.metadata("lang", language.as_deref().unwrap_or("en"))
        .map_err(|e| e.to_string())?;
    epub.metadata("generator", "Become An Author")
        .map_err(|e| e.to_string())?;

    let css = r#"
        body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 1em;
            line-height: 1.6;
            text-align: justify;
            margin: 1.5em;
        }
        h1 {
            font-size: 2em;
            margin: 1.5em 0 1em 0;
            text-align: center;
            page-break-before: always;
        }
        h2 {
            font-size: 1.5em;
            margin: 1.2em 0 0.8em 0;
        }
        h3 {
            font-size: 1.2em;
            margin: 1em 0 0.6em 0;
        }
        p {
            margin: 0 0 0.5em 0;
            text-indent: 1.5em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        .scene-break {
            text-align: center;
            margin: 1.5em 0;
        }
    "#;
    epub.stylesheet(css.as_bytes()).map_err(|e| e.to_string())?;

    fn add_chapters_to_epub(
        epub: &mut EpubBuilder<ZipLibrary>,
        nodes: &[StructureNode],
        project_path: &str,
        chapter_num: &mut i32,
    ) -> Result<(), String> {
        for node in nodes {
            match node.node_type.as_str() {
                "act" => {
                    add_chapters_to_epub(epub, &node.children, project_path, chapter_num)?;
                }
                "chapter" => {
                    let mut content = format!("<h2>{}</h2>\n", node.title);

                    for scene in &node.children {
                        if scene.node_type == "scene" {
                            content.push_str(&format!("<h3>{}</h3>\n", scene.title));

                            if let Some(file) = &scene.file {
                                let file_path =
                                    PathBuf::from(project_path).join("manuscript").join(file);
                                if let Ok(file_content) = fs::read_to_string(&file_path) {
                                    let body = extract_scene_body(&file_content);

                                    if let Ok(tiptap) =
                                        serde_json::from_str::<serde_json::Value>(body)
                                    {
                                        let text = extract_text_from_tiptap(&tiptap);
                                        for para in
                                            text.split("\n\n").filter(|s| !s.trim().is_empty())
                                        {
                                            content.push_str(&format!("<p>{}</p>\n", para.trim()));
                                        }
                                    } else {
                                        for para in
                                            body.split("\n\n").filter(|s| !s.trim().is_empty())
                                        {
                                            content.push_str(&format!("<p>{}</p>\n", para.trim()));
                                        }
                                    }
                                }
                            }

                            content.push_str("<p class=\"scene-break\">* * *</p>\n");
                        }
                    }

                    *chapter_num += 1;
                    epub.add_content(
                        EpubContent::new(
                            format!("chapter{}.xhtml", chapter_num),
                            content.as_bytes(),
                        )
                        .title(&node.title),
                    )
                    .map_err(|e| e.to_string())?;
                }
                _ => {}
            }
        }
        Ok(())
    }

    let mut chapter_num = 0;
    add_chapters_to_epub(&mut epub, &structure, &project_path, &mut chapter_num)?;

    let mut output_file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create output file: {}", e))?;

    epub.generate(&mut output_file)
        .map_err(|e| format!("Failed to generate ePub: {}", e))?;

    Ok(output_path)
}

pub fn collect_scene_files(
    project_path: &str,
    nodes: &[StructureNode],
) -> serde_json::Map<String, serde_json::Value> {
    fn walk(
        project_path: &str,
        nodes: &[StructureNode],
        out: &mut serde_json::Map<String, serde_json::Value>,
    ) {
        for node in nodes {
            if let Some(file) = &node.file {
                let file_path = PathBuf::from(project_path).join("manuscript").join(file);
                if let Ok(content) = fs::read_to_string(file_path) {
                    out.insert(file.clone(), serde_json::Value::String(content));
                }
            }
            if !node.children.is_empty() {
                walk(project_path, &node.children, out);
            }
        }
    }

    let mut files = serde_json::Map::new();
    walk(project_path, nodes, &mut files);
    files
}
