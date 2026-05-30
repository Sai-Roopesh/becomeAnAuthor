import { invoke } from "@/core/tauri/invoke";
import type { LoadedSceneDto, SceneMeta } from "./types";
import type { TiptapContent } from "@/shared/types/tiptap";
import type { SceneNote } from "@/domain/entities/types";

export interface SceneMetadataUpdates {
  title?: string;
  status?: string;
  pov?: string;
  subtitle?: string;
  labels?: string[];
  excludeFromAI?: boolean;
  summary?: string;
  archived?: boolean;
}

export async function loadScene(
  projectPath: string,
  sceneFile: string,
): Promise<LoadedSceneDto> {
  return invoke<LoadedSceneDto>("load_scene", { projectPath, sceneFile });
}

export async function saveScene(
  projectPath: string,
  sceneFile: string,
  content: TiptapContent,
  title?: string,
  wordCount: number = -1,
): Promise<SceneMeta> {
  if (!content || typeof content !== "object" || !("type" in content)) {
    throw new Error("Invalid Tiptap content structure");
  }

  // C-3 fix: Rust save_scene expects content as a JSON String, not an object.
  // C-4 fix: Rust save_scene requires word_count: i32; pass -1 to let Rust
  //          resolve the word count from the serialised content itself.
  return invoke<SceneMeta>("save_scene", {
    projectPath,
    sceneFile,
    content: JSON.stringify(content),
    title,
    wordCount,
  });
}

export async function updateSceneMetadata(
  projectPath: string,
  sceneFile: string,
  updates: Partial<SceneMetadataUpdates>,
): Promise<SceneMeta> {
  return invoke<SceneMeta>("update_scene_metadata", {
    projectPath,
    sceneFile,
    updates,
  });
}

export async function deleteScene(
  projectPath: string,
  sceneFile: string,
): Promise<void> {
  return invoke("delete_scene", { projectPath, sceneFile });
}

export async function saveSceneById(
  projectPath: string,
  sceneId: string,
  content: string,
  wordCount: number,
): Promise<void> {
  return invoke("save_scene_by_id", {
    projectPath,
    sceneId,
    content,
    wordCount,
  });
}

export async function getSceneNote(
  projectPath: string,
  sceneId: string,
): Promise<SceneNote | null> {
  return invoke<SceneNote | null>("get_scene_note", { projectPath, sceneId });
}

export async function saveSceneNote(
  projectPath: string,
  note: SceneNote,
): Promise<void> {
  return invoke("save_scene_note", { projectPath, note });
}

export async function deleteSceneNote(
  projectPath: string,
  sceneId: string,
): Promise<void> {
  return invoke("delete_scene_note", { projectPath, sceneId });
}

export async function deleteYjsState(
  projectPath: string,
  sceneId: string,
): Promise<void> {
  return invoke("delete_yjs_state", { projectPath, sceneId });
}
