"use client";
/**
 * Context Assembly Hook
 * Builds provenance-rich context sources and packs them by relevance + token budget.
 */

import { useCallback } from "react";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { logger } from "@/shared/utils/logger";
import {
  packContext,
  type ContextSource,
  type ContextPackResult,
} from "@/shared/utils/context-packer";
import type {
  Scene,
  Act,
  Chapter,
  BaseNode,
  CodexEntry,
} from "@/domain/entities/types";
import type { TiptapContent, TiptapNode } from "@/shared/types/tiptap";
import { isElementNode } from "@/shared/types/tiptap";
import type { ContextItem } from "@/features/shared/components";

const log = logger.scope("ContextAssembly");

// Union type for all node types
export type StoryNode = Scene | Act | Chapter | (BaseNode & { type: string });

interface AssembleContextOptions {
  query: string;
  model: string;
  maxContextTokens?: number;
  maxBlocks?: number;
}

function isSceneNode(node: StoryNode): node is Scene {
  return node.type === "scene";
}

function formatSceneContent(scene: Scene): string {
  const lines: string[] = [];
  lines.push(`Scene: ${scene.title}`);

  if (scene.pov) {
    lines.push(`POV: ${scene.pov}`);
  }
  if (scene.subtitle) {
    lines.push(`Subtitle: ${scene.subtitle}`);
  }
  if (scene.summary) {
    lines.push(`Summary: ${scene.summary}`);
  }

  const text = extractTextFromTiptap(scene.content);
  if (text) {
    lines.push("Content:");
    lines.push(text);
  }

  return lines.join("\n").trim();
}

function formatCodexContent(entry: CodexEntry): string {
  const lines: string[] = [];
  lines.push(`${entry.category.toUpperCase()}: ${entry.name}`);

  if (entry.coreDescription) {
    lines.push(`Key traits: ${entry.coreDescription}`);
  }
  if (entry.description) {
    lines.push(entry.description);
  }

  const attrEntries = Object.entries(entry.attributes ?? {}).filter(
    ([, value]) => Boolean(value),
  );
  if (attrEntries.length > 0) {
    lines.push("Attributes:");
    for (const [key, value] of attrEntries) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  if (entry.aliases?.length) {
    lines.push(`Aliases: ${entry.aliases.join(", ")}`);
  }

  return lines.join("\n").trim();
}

function addOrReplaceSource(
  sourceMap: Map<string, ContextSource>,
  source: ContextSource,
): void {
  const key = `${source.type}:${source.id}`;
  const existing = sourceMap.get(key);
  if (!existing || existing.content.length < source.content.length) {
    sourceMap.set(key, source);
  }
}

function extractTextFromTiptap(
  content: TiptapContent | null | undefined,
): string {
  if (!content || !content.content) {
    return "";
  }

  let text = "";

  const processNode = (node: TiptapNode): void => {
    if (node.type === "text") {
      text += node.text || "";
    } else if (
      isElementNode(node) &&
      node.content &&
      Array.isArray(node.content)
    ) {
      for (const child of node.content) {
        processNode(child);
      }
      if (node.type === "paragraph" || node.type === "heading") {
        text += "\n";
      }
    }
  };

  if (Array.isArray(content.content)) {
    for (const node of content.content) {
      processNode(node);
    }
  }

  return text.trim();
}

export function useContextAssembly(projectId: string, seriesId?: string) {
  const {
    nodeRepository: nodeRepo,
    codexRepository: codexRepo,
    projectRepository: projectRepo,
  } = useAppServices();

  const loadScene = useCallback(
    async (sceneId: string): Promise<Scene | null> => {
      const node = (await nodeRepo.get(sceneId)) as Scene | undefined;
      if (!node || node.type !== "scene") {
        return null;
      }
      return node;
    },
    [nodeRepo],
  );

  const resolveSeriesId = useCallback(async (): Promise<string | undefined> => {
    if (seriesId) return seriesId;
    const project = await projectRepo.get(projectId);
    return project?.seriesId;
  }, [seriesId, projectRepo, projectId]);

  const assembleContextPack = useCallback(
    async (
      selectedContexts: ContextItem[],
      options: AssembleContextOptions,
    ): Promise<ContextPackResult> => {
      if (selectedContexts.length === 0) {
        return packContext([], {
          query: options.query,
          model: options.model,
          ...(options.maxContextTokens !== undefined && {
            maxContextTokens: options.maxContextTokens,
          }),
          ...(options.maxBlocks !== undefined && {
            maxBlocks: options.maxBlocks,
          }),
        });
      }

      const effectiveSeriesId = await resolveSeriesId();
      const sourceMap = new Map<string, ContextSource>();

      const allNodes = (await nodeRepo.getByProject(projectId)) as StoryNode[];
      const scenesById = new Map(
        allNodes.filter(isSceneNode).map((scene) => [scene.id, scene]),
      );

      for (const selected of selectedContexts) {
        try {
          if (selected.type === "novel") {
            for (const scene of scenesById.values()) {
              if (scene.excludeFromAI) continue;
              const fullScene = (await loadScene(scene.id)) ?? scene;
              addOrReplaceSource(sourceMap, {
                id: fullScene.id,
                type: "scene",
                label: fullScene.title,
                content: formatSceneContent(fullScene),
                updatedAt: fullScene.updatedAt,
              });
            }
            continue;
          }

          if (selected.type === "outline") {
            const outline = allNodes
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((node) => `${node.type.toUpperCase()}: ${node.title}`)
              .join("\n");

            addOrReplaceSource(sourceMap, {
              id: "project-outline",
              type: "outline",
              label: "Full Outline",
              content: outline,
            });
            continue;
          }

          if (selected.type === "scene" && selected.id) {
            const scene = await loadScene(selected.id);
            if (!scene) continue;
            addOrReplaceSource(sourceMap, {
              id: scene.id,
              type: "scene",
              label: scene.title,
              content: formatSceneContent(scene),
              updatedAt: scene.updatedAt,
            });
            continue;
          }

          if (selected.type === "act" && selected.id) {
            const children = (await nodeRepo.getChildren(
              selected.id,
            )) as StoryNode[];
            for (const child of children) {
              if (isSceneNode(child)) {
                if (child.excludeFromAI) continue;
                const fullScene = (await loadScene(child.id)) ?? child;
                addOrReplaceSource(sourceMap, {
                  id: fullScene.id,
                  type: "scene",
                  label: fullScene.title,
                  content: formatSceneContent(fullScene),
                  updatedAt: fullScene.updatedAt,
                });
                continue;
              }

              if (child.type === "chapter") {
                const chapterScenes = (await nodeRepo.getChildren(
                  child.id,
                )) as StoryNode[];
                for (const chapterScene of chapterScenes.filter(isSceneNode)) {
                  if (chapterScene.excludeFromAI) continue;
                  const fullScene =
                    (await loadScene(chapterScene.id)) ?? chapterScene;
                  addOrReplaceSource(sourceMap, {
                    id: fullScene.id,
                    type: "scene",
                    label: fullScene.title,
                    content: formatSceneContent(fullScene),
                    updatedAt: fullScene.updatedAt,
                  });
                }
              }
            }
            continue;
          }

          if (selected.type === "chapter" && selected.id) {
            const children = (await nodeRepo.getChildren(
              selected.id,
            )) as StoryNode[];
            for (const scene of children.filter(isSceneNode)) {
              if (scene.excludeFromAI) continue;
              const fullScene = (await loadScene(scene.id)) ?? scene;
              addOrReplaceSource(sourceMap, {
                id: fullScene.id,
                type: "scene",
                label: fullScene.title,
                content: formatSceneContent(fullScene),
                updatedAt: fullScene.updatedAt,
              });
            }
            continue;
          }

          if (selected.type === "codex" && selected.id && effectiveSeriesId) {
            const entry = await codexRepo.get(effectiveSeriesId, selected.id);
            if (!entry) continue;

            addOrReplaceSource(sourceMap, {
              id: entry.id,
              type: "codex",
              label: entry.name,
              content: formatCodexContent(entry),
              updatedAt: entry.updatedAt,
            });
          }
        } catch (error) {
          log.error(`Failed to load context item: ${selected.label}`, error);
        }
      }

      return packContext(Array.from(sourceMap.values()), {
        query: options.query,
        model: options.model,
        ...(options.maxContextTokens !== undefined && {
          maxContextTokens: options.maxContextTokens,
        }),
        ...(options.maxBlocks !== undefined && {
          maxBlocks: options.maxBlocks,
        }),
      });
    },
    [resolveSeriesId, nodeRepo, projectId, loadScene, codexRepo],
  );

  return {
    assembleContextPack,
  };
}
