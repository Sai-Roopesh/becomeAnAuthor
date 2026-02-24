import { invoke } from "@tauri-apps/api/core";
import type { Scene, SceneMeta } from "./types";
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
): Promise<Scene> {
  return invoke<Scene>("load_scene", { projectPath, sceneFile });
}

export async function saveScene(
  projectPath: string,
  sceneFile: string,
  content: TiptapContent,
  title?: string,
): Promise<SceneMeta> {
  if (!content || typeof content !== "object" || !("type" in content)) {
    throw new Error("Invalid Tiptap content structure");
  }

  return invoke<SceneMeta>("save_scene", {
    projectPath,
    sceneFile,
    content,
    title,
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
