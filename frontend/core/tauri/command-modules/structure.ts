import { invoke } from "@tauri-apps/api/core";
import type { StructureNode } from "./types";

export async function getStructure(
  projectPath: string,
): Promise<StructureNode[]> {
  return invoke<StructureNode[]>("get_structure", { projectPath });
}

export async function saveStructure(
  projectPath: string,
  structure: StructureNode[],
): Promise<void> {
  return invoke("save_structure", { projectPath, structure });
}

export async function createNode(
  projectPath: string,
  parentId: string | null,
  nodeType: string,
  title: string,
): Promise<StructureNode> {
  return invoke<StructureNode>("create_node", {
    projectPath,
    parentId,
    nodeType,
    title,
  });
}
