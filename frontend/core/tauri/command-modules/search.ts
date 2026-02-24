import { invoke } from "@tauri-apps/api/core";
import type { SearchResult } from "./types";

export async function searchProject(
  projectPath: string,
  query: string,
  scope?: "all" | "scenes" | "codex",
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("search_project", {
    projectPath,
    query,
    ...(scope ? { scope } : {}),
  });
}
