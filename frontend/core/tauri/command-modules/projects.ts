import { invoke } from "@tauri-apps/api/core";
import type {
  ProjectMeta,
  ProjectUpdates,
  RecentProject,
  TrashedProject,
} from "./types";

export async function getProjectsPath(): Promise<string> {
  return invoke<string>("get_projects_path");
}

export async function listProjects(): Promise<ProjectMeta[]> {
  return invoke<ProjectMeta[]>("list_projects");
}

export async function createProject(
  title: string,
  author: string,
  customPath: string,
  seriesId: string,
  seriesIndex: string,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("create_project", {
    title,
    author,
    customPath,
    seriesId,
    seriesIndex,
  });
}

export async function deleteProject(projectPath: string): Promise<void> {
  return invoke("delete_project", { projectPath });
}

export async function listProjectTrash(): Promise<TrashedProject[]> {
  return invoke<TrashedProject[]>("list_project_trash");
}

export async function restoreTrashedProject(
  trashPath: string,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("restore_trashed_project", { trashPath });
}

export async function permanentlyDeleteTrashedProject(
  trashPath: string,
): Promise<void> {
  return invoke("permanently_delete_trashed_project", { trashPath });
}

export async function listRecentProjects(): Promise<RecentProject[]> {
  return invoke<RecentProject[]>("list_recent_projects");
}

export async function addToRecent(
  projectPath: string,
  title: string,
): Promise<void> {
  return invoke("add_to_recent", { projectPath, title });
}

export async function removeFromRecent(projectPath: string): Promise<void> {
  return invoke("remove_from_recent", { projectPath });
}

export async function openProject(projectPath: string): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("open_project", { projectPath });
}

export async function showOpenProjectDialog(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Your Novel",
  });
  return selected as string | null;
}

export async function updateProject(
  projectPath: string,
  updates: ProjectUpdates,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("update_project", { projectPath, updates });
}

export async function archiveProject(
  projectPath: string,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>("archive_project", { projectPath });
}
