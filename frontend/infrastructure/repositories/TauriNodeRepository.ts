/**
 * Tauri Node Repository
 * Implements INodeRepository using file system through Tauri commands
 * Desktop-only application - uses Tauri backend for all storage operations
 */

import type { INodeRepository } from "@/domain/repositories/INodeRepository";
import type { DocumentNode, Scene } from "@/domain/entities/types";
import {
  getStructure,
  saveStructure,
  createNode,
  loadScene,
  saveScene,
  updateSceneMetadata,
  deleteScene,
  deleteSceneNote,
  deleteYjsState,
  listSceneCodexLinks,
  deleteSceneCodexLink,
  type StructureNode,
} from "@/core/tauri";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriNodeRepository");

/**
 * Convert Tauri structure to app's node format
 */
function structureNodeToDocumentNode(
  node: StructureNode,
  projectId: string,
  parentId: string | null,
): DocumentNode | Scene {
  const now = Date.now();
  const baseNode = {
    id: node.id,
    projectId,
    parentId,
    title: node.title,
    order: node.order,
    expanded: true,
    createdAt: now,
    updatedAt: now,
  };

  if (node.type === "scene") {
    return {
      ...baseNode,
      type: "scene" as const,
      content: { type: "doc", content: [] },
      summary: "",
      status: "draft" as const,
      wordCount: 0,
      _tauriFile: node.file, // Store file reference for loading content
    } as Scene & { _tauriFile?: string };
  }

  return {
    ...baseNode,
    type: node.type as "act" | "chapter",
  } as DocumentNode;
}

/**
 * Flatten structure tree to array
 */
function flattenStructure(
  nodes: StructureNode[],
  projectId: string,
  parentId: string | null = null,
): (DocumentNode | Scene)[] {
  const result: (DocumentNode | Scene)[] = [];

  for (const node of nodes) {
    result.push(structureNodeToDocumentNode(node, projectId, parentId));
    if (node.children?.length) {
      result.push(...flattenStructure(node.children, projectId, node.id));
    }
  }

  return result;
}

function extractSceneMetadata(data: Record<string, unknown>) {
  const labelsValue = data["labels"];
  const labels = Array.isArray(labelsValue)
    ? labelsValue.map((l) => String(l)).filter((l) => l.length > 0)
    : [];

  const pov =
    (data["pov"] as string | undefined) ??
    (data["pov_character"] as string | undefined) ??
    (data["povCharacter"] as string | undefined);

  const subtitle = (data["subtitle"] as string | undefined) ?? undefined;

  const summary = (data["summary"] as string | undefined) ?? "";

  const status = (data["status"] as string | undefined) ?? "draft";

  const wordCount = Number(data["word_count"] ?? data["wordCount"] ?? 0);

  const excludeFromAI = Boolean(
    data["exclude_from_ai"] ?? data["excludeFromAI"] ?? false,
  );

  const archived = Boolean(data["archived"] ?? false);

  const createdAtStr = data["created_at"] as string | undefined;
  const updatedAtStr = data["updated_at"] as string | undefined;

  // Fallback to now if missing (e.g. legacy files)
  const createdAt = createdAtStr
    ? new Date(createdAtStr).getTime()
    : Date.now();
  const updatedAt = updatedAtStr
    ? new Date(updatedAtStr).getTime()
    : Date.now();

  return {
    wordCount,
    status: status as "draft" | "revised" | "final",
    pov,
    subtitle,
    labels,
    excludeFromAI,
    summary,
    archived,
    createdAt,
    updatedAt,
  };
}

function parseSceneContent(rawContent: unknown) {
  try {
    if (typeof rawContent === "string") {
      return JSON.parse(rawContent);
    }
    if (rawContent && typeof rawContent === "object") {
      return rawContent;
    }
  } catch {
    // Fall through to plaintext fallback below.
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: String(rawContent ?? "") }],
      },
    ],
  };
}

/**
 * Tauri-based Node Repository
 * Only used when running in Tauri desktop app
 *
 * Note: Uses instance-level project path to avoid global mutable state.
 * Access via singleton getInstance() or create with specific path.
 */
export class TauriNodeRepository implements INodeRepository {
  private projectPath: string | null = null;

  // Singleton instance for default usage
  private static instance: TauriNodeRepository | null = null;

  static getInstance(): TauriNodeRepository {
    if (!TauriNodeRepository.instance) {
      TauriNodeRepository.instance = new TauriNodeRepository();
    }
    return TauriNodeRepository.instance;
  }

  /**
   * Set the project path for this repository instance
   */
  setProjectPath(path: string | null): void {
    this.projectPath = path;
  }

  /**
   * Get the current project path
   */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  private collectSceneMetadata(nodes: StructureNode[]): {
    ids: string[];
    files: string[];
  } {
    const ids: string[] = [];
    const files: string[] = [];

    for (const node of nodes) {
      if (node.type === "scene") {
        ids.push(node.id);
        if (node.file) {
          files.push(node.file);
        }
      }
      const childMeta = this.collectSceneMetadata(node.children || []);
      ids.push(...childMeta.ids);
      files.push(...childMeta.files);
    }

    return { ids, files };
  }

  private async deleteSceneCodexLinksBySceneIds(
    sceneIds: string[],
  ): Promise<void> {
    if (!this.projectPath || sceneIds.length === 0) return;

    const links = await listSceneCodexLinks(this.projectPath);
    const targetIds = new Set(sceneIds);
    const linksToDelete = links.filter((link) => targetIds.has(link.sceneId));

    for (const link of linksToDelete) {
      await deleteSceneCodexLink(this.projectPath, link.id);
    }
  }

  private async cleanupSceneArtifacts(sceneIds: string[]): Promise<void> {
    if (!this.projectPath || sceneIds.length === 0) return;

    for (const sceneId of new Set(sceneIds)) {
      const results = await Promise.allSettled([
        deleteYjsState(this.projectPath, sceneId),
        deleteSceneNote(this.projectPath, sceneId),
      ]);

      if (results[0].status === "rejected") {
        log.warn("Failed to delete Yjs state for scene", {
          sceneId,
          error: String(results[0].reason),
        });
      }
      if (results[1].status === "rejected") {
        log.warn("Failed to delete scene note for scene", {
          sceneId,
          error: String(results[1].reason),
        });
      }
    }
  }

  async get(id: string): Promise<DocumentNode | Scene | undefined> {
    if (!this.projectPath) return undefined;

    const structure = await getStructure(this.projectPath);
    const allNodes = flattenStructure(structure, "current");
    const node = allNodes.find((n) => n.id === id);

    // If it's a scene, load the content
    if (node && node.type === "scene") {
      const tauriNode = node as Scene & { _tauriFile?: string };
      if (tauriNode._tauriFile) {
        try {
          const scene = await loadScene(this.projectPath, tauriNode._tauriFile);
          const data = scene as unknown as Record<string, unknown>;
          const metadata = extractSceneMetadata(data);
          const parsedContent = parseSceneContent(data["content"]);

          return {
            ...node,
            content: parsedContent,
            ...metadata,
          } as Scene;
        } catch {
          return node;
        }
      }
    }

    return node;
  }

  async getByProject(projectId: string): Promise<(DocumentNode | Scene)[]> {
    if (!this.projectPath) return [];

    const structure = await getStructure(this.projectPath);
    const nodes = flattenStructure(structure, projectId);

    // Load word counts for scenes from their individual files
    // Structure.json doesn't store word counts - they're in scene file frontmatter
    log.debug(
      `getByProject: Loading word counts for ${nodes.filter((n) => n.type === "scene").length} scenes`,
    );

    const enrichedNodes = await Promise.all(
      nodes.map(async (node) => {
        if (node.type === "scene") {
          const sceneNode = node as Scene & { _tauriFile?: string };
          if (sceneNode._tauriFile && this.projectPath) {
            try {
              const sceneData = await loadScene(
                this.projectPath,
                sceneNode._tauriFile,
              );
              const data = sceneData as unknown as Record<string, unknown>;
              const metadata = extractSceneMetadata(data);
              const parsedContent = parseSceneContent(data["content"]);

              log.debug("Loaded scene metadata", {
                title: node.title,
                wordCount: metadata.wordCount,
              });
              return {
                ...node,
                content: parsedContent,
                ...metadata,
              } as Scene;
            } catch (err) {
              log.error(`Failed to load scene ${node.id}:`, err);
              return node;
            }
          }
        }
        return node;
      }),
    );

    return enrichedNodes;
  }

  async getByParent(
    projectId: string,
    parentId: string | null,
  ): Promise<(DocumentNode | Scene)[]> {
    if (!this.projectPath) return [];

    const structure = await getStructure(this.projectPath);

    if (parentId === null) {
      // Return root level nodes
      return structure.map((n: StructureNode) =>
        structureNodeToDocumentNode(n, projectId, null),
      );
    }

    // Find parent and return its children
    const findChildren = (
      nodes: StructureNode[],
      targetId: string,
    ): StructureNode[] => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node.children || [];
        }
        const found = findChildren(node.children || [], targetId);
        if (found.length) return found;
      }
      return [];
    };

    const children = findChildren(structure, parentId);
    return children.map((n) =>
      structureNodeToDocumentNode(n, projectId, parentId),
    );
  }

  async getChildren(parentId: string): Promise<(DocumentNode | Scene)[]> {
    return this.getByParent("current", parentId);
  }

  async create(
    node: Partial<DocumentNode | Scene> & {
      projectId: string;
      type: "act" | "chapter" | "scene";
    },
  ): Promise<DocumentNode | Scene> {
    if (!this.projectPath) {
      throw new Error("No project path set");
    }

    const parentId = node.parentId || null;
    const createdNode = await createNode(
      this.projectPath,
      parentId,
      node.type,
      node.title || "Untitled",
    );

    return structureNodeToDocumentNode(createdNode, node.projectId, parentId);
  }

  async update(id: string, data: Partial<DocumentNode | Scene>): Promise<void> {
    log.debug("update called", { id, data, projectPath: this.projectPath });

    if (!this.projectPath) {
      log.warn("No project path set - returning early");
      return;
    }

    // If updating scene content, save to file
    if ("content" in data && data.content) {
      log.debug("Updating scene content");
      const structure = await getStructure(this.projectPath);
      const allNodes = flattenStructure(structure, "current");
      const node = allNodes.find((n) => n.id === id) as
        | (Scene & { _tauriFile?: string })
        | undefined;

      if (node?._tauriFile) {
        // saveScene expects TiptapContent object, not string
        await saveScene(
          this.projectPath,
          node._tauriFile,
          data.content,
          data.title,
        );
        log.debug("Scene content saved");
      }
    }

    // Update structure if title changed
    if (data.title) {
      log.debug("Updating title", { newTitle: data.title });
      const structure = await getStructure(this.projectPath);
      log.debug("Got structure, updating...");

      const updateNodeTitle = (nodes: StructureNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === id) {
            log.debug("Found node, updating title", {
              from: node.title,
              to: data.title,
            });
            node.title = data.title!;
            return true;
          }
          if (updateNodeTitle(node.children || [])) return true;
        }
        return false;
      };

      const updated = updateNodeTitle(structure);
      log.debug("Title update result", { updated });

      if (updated) {
        log.debug("Saving structure...");
        await saveStructure(this.projectPath, structure);
        log.debug("Structure saved successfully");
      } else {
        log.warn("Node not found in structure!");
      }
    }

    log.debug("Update complete");
  }

  async updateMetadata(id: string, metadata: Partial<Scene>): Promise<void> {
    if (!this.projectPath) return;

    const structure = await getStructure(this.projectPath);
    const allNodes = flattenStructure(structure, "current");
    const node = allNodes.find((n) => n.id === id) as
      | (Scene & { _tauriFile?: string })
      | undefined;

    if (!node || node.type !== "scene" || !node._tauriFile) {
      return;
    }

    const updates: Partial<{
      title: string;
      status: string;
      pov: string;
      subtitle: string;
      labels: string[];
      excludeFromAI: boolean;
      summary: string;
      archived: boolean;
    }> = {};

    if (metadata.title !== undefined) updates.title = metadata.title;
    if (metadata.status !== undefined) updates.status = metadata.status;
    if (metadata.pov !== undefined) updates.pov = metadata.pov;
    if (metadata.subtitle !== undefined) updates.subtitle = metadata.subtitle;
    if (metadata.labels !== undefined) updates.labels = metadata.labels;
    if (metadata.excludeFromAI !== undefined)
      updates.excludeFromAI = metadata.excludeFromAI;
    if (metadata.summary !== undefined) updates.summary = metadata.summary;
    if (metadata.archived !== undefined) updates.archived = metadata.archived;

    if (Object.keys(updates).length === 0) return;

    await updateSceneMetadata(this.projectPath, node._tauriFile, updates);

    // Keep manuscript structure title aligned with scene frontmatter title.
    if (updates.title) {
      await this.update(id, { title: updates.title });
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.projectPath) return;

    const structure = await getStructure(this.projectPath);

    // Find and remove node
    const removeNode = (
      nodes: StructureNode[],
      targetId: string,
    ): StructureNode | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] && nodes[i]!.id === targetId) {
          const removed = nodes.splice(i, 1)[0];
          return removed ?? null;
        }
        const found = nodes[i]
          ? removeNode(nodes[i]!.children || [], targetId)
          : null;
        if (found) return found;
      }
      return null;
    };

    const removed = removeNode(structure, id);

    if (removed) {
      const removedScenes = this.collectSceneMetadata([removed]);

      for (const file of removedScenes.files) {
        await deleteScene(this.projectPath, file);
      }
      await this.deleteSceneCodexLinksBySceneIds(removedScenes.ids);
      await this.cleanupSceneArtifacts(removedScenes.ids);

      await saveStructure(this.projectPath, structure);
    }
  }

  async deleteCascade(
    id: string,
    type: "act" | "chapter" | "scene",
  ): Promise<void> {
    if (!this.projectPath) return;

    const structure = await getStructure(this.projectPath);

    const removeNode = (
      nodes: StructureNode[],
      targetId: string,
    ): StructureNode | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] && nodes[i]!.id === targetId) {
          return nodes.splice(i, 1)[0] ?? null;
        }
        const found = nodes[i]
          ? removeNode(nodes[i]!.children || [], targetId)
          : null;
        if (found) return found;
      }
      return null;
    };

    const removed = removeNode(structure, id);

    if (removed) {
      if (removed.type !== type) {
        log.warn("deleteCascade type mismatch", {
          id,
          requestedType: type,
          actualType: removed.type,
        });
      }

      const removedScenes = this.collectSceneMetadata([removed]);
      for (const file of new Set(removedScenes.files)) {
        await deleteScene(this.projectPath, file);
      }
      await this.deleteSceneCodexLinksBySceneIds(removedScenes.ids);
      await this.cleanupSceneArtifacts(removedScenes.ids);

      await saveStructure(this.projectPath, structure);
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }
}
