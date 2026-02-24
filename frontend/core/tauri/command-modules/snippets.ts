import { invoke } from "@tauri-apps/api/core";
import type { Snippet } from "@/domain/entities/types";

export async function listSnippets(projectPath: string): Promise<Snippet[]> {
  return invoke<Snippet[]>("list_snippets", { projectPath });
}

export async function saveSnippet(
  projectPath: string,
  snippet: Snippet,
): Promise<void> {
  return invoke("save_snippet", { projectPath, snippet });
}

export async function deleteSnippet(
  projectPath: string,
  snippetId: string,
): Promise<void> {
  return invoke("delete_snippet", { projectPath, snippetId });
}
