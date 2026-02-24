import { invoke } from "@tauri-apps/api/core";
import type {
  CodexEntry,
  CodexEntryTag,
  CodexRelation,
  CodexRelationType,
  CodexTag,
  CodexTemplate,
  SceneCodexLink,
} from "@/domain/entities/types";

export async function listCodexEntries(
  projectPath: string,
  category?: string,
): Promise<CodexEntry[]> {
  return invoke<CodexEntry[]>("list_codex_entries", { projectPath, category });
}

export async function saveCodexEntry(
  projectPath: string,
  entry: CodexEntry,
): Promise<void> {
  return invoke("save_codex_entry", { projectPath, entry });
}

export async function deleteCodexEntry(
  projectPath: string,
  category: string,
  entryId: string,
): Promise<void> {
  return invoke("delete_codex_entry", { projectPath, category, entryId });
}

export async function listCodexRelations(
  projectPath: string,
): Promise<CodexRelation[]> {
  return invoke<CodexRelation[]>("list_codex_relations", { projectPath });
}

export async function saveCodexRelation(
  projectPath: string,
  relation: CodexRelation,
): Promise<void> {
  return invoke("save_codex_relation", { projectPath, relation });
}

export async function deleteCodexRelation(
  projectPath: string,
  relationId: string,
): Promise<void> {
  return invoke("delete_codex_relation", { projectPath, relationId });
}

export async function listCodexTags(projectPath: string): Promise<CodexTag[]> {
  return invoke<CodexTag[]>("list_codex_tags", { projectPath });
}

export async function saveCodexTag(
  projectPath: string,
  tag: CodexTag,
): Promise<void> {
  return invoke("save_codex_tag", { projectPath, tag });
}

export async function deleteCodexTag(
  projectPath: string,
  tagId: string,
): Promise<void> {
  return invoke("delete_codex_tag", { projectPath, tagId });
}

export async function listCodexEntryTags(
  projectPath: string,
): Promise<CodexEntryTag[]> {
  return invoke<CodexEntryTag[]>("list_codex_entry_tags", { projectPath });
}

export async function saveCodexEntryTag(
  projectPath: string,
  entryTag: CodexEntryTag,
): Promise<void> {
  return invoke("save_codex_entry_tag", { projectPath, entryTag });
}

export async function deleteCodexEntryTag(
  projectPath: string,
  entryTagId: string,
): Promise<void> {
  return invoke("delete_codex_entry_tag", { projectPath, entryTagId });
}

export async function listCodexTemplates(
  projectPath: string,
): Promise<CodexTemplate[]> {
  return invoke<CodexTemplate[]>("list_codex_templates", { projectPath });
}

export async function saveCodexTemplate(
  projectPath: string,
  template: CodexTemplate,
): Promise<void> {
  return invoke("save_codex_template", { projectPath, template });
}

export async function deleteCodexTemplate(
  projectPath: string,
  templateId: string,
): Promise<void> {
  return invoke("delete_codex_template", { projectPath, templateId });
}

export async function listCodexRelationTypes(
  projectPath: string,
): Promise<CodexRelationType[]> {
  return invoke<CodexRelationType[]>("list_codex_relation_types", {
    projectPath,
  });
}

export async function saveCodexRelationType(
  projectPath: string,
  relationType: CodexRelationType,
): Promise<void> {
  return invoke("save_codex_relation_type", { projectPath, relationType });
}

export async function deleteCodexRelationType(
  projectPath: string,
  typeId: string,
): Promise<void> {
  return invoke("delete_codex_relation_type", { projectPath, typeId });
}

export async function listSceneCodexLinks(
  projectPath: string,
): Promise<SceneCodexLink[]> {
  return invoke<SceneCodexLink[]>("list_scene_codex_links", { projectPath });
}

export async function saveSceneCodexLink(
  projectPath: string,
  link: SceneCodexLink,
): Promise<void> {
  return invoke("save_scene_codex_link", { projectPath, link });
}

export async function deleteSceneCodexLink(
  projectPath: string,
  linkId: string,
): Promise<void> {
  return invoke("delete_scene_codex_link", { projectPath, linkId });
}
