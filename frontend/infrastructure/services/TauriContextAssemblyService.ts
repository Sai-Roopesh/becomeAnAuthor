/**
 * Tauri Context Assembly Service
 * Implements IContextAssemblyService by composing INodeRepository and
 * ICodexRepository instead of calling Tauri IPC directly.
 *
 * Reproduces the token-budget and formatting logic from
 * frontend/features/editor/utils/context-engine.ts, but operates
 * exclusively through repository interfaces so the implementation can
 * be swapped out or tested in isolation.
 */

import type {
  IContextAssemblyService,
  ContextAssemblyOptions,
} from "@/domain/entities/IContextAssemblyService";
import type { INodeRepository } from "@/domain/repositories/INodeRepository";
import type { ICodexRepository } from "@/domain/repositories/ICodexRepository";
import type { CodexEntry } from "@/domain/entities/types";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TauriContextAssemblyService");

// Helper to yield to the main thread and prevent blocking the UI
const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

// =============================================================================
// @MENTION EXTRACTION
// =============================================================================

/**
 * Extract all @mention codex IDs from Tiptap JSON content.
 * Scans for nodes with type "mention" and extracts their codex entry IDs.
 */
function extractMentionIds(content: unknown): string[] {
  const ids: string[] = [];

  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    const obj = node as Record<string, unknown>;

    if (obj["type"] === "mention" && obj["attrs"]) {
      const attrs = obj["attrs"] as Record<string, unknown>;
      if (typeof attrs["id"] === "string") {
        ids.push(attrs["id"]);
      }
    }

    if (obj["content"]) traverse(obj["content"]);
  }

  traverse(content);
  return [...new Set(ids)];
}

// =============================================================================
// RICH CODEX FORMATTING
// =============================================================================

/**
 * Format a codex entry with full details for AI context.
 * Includes: name, description, attributes, aliases, coreDescription.
 */
function formatCodexEntry(entry: CodexEntry): string {
  const lines: string[] = [];

  lines.push(`### ${entry.name} (${entry.category.toUpperCase()})`);

  if (entry.description) {
    lines.push(entry.description);
  }

  if (entry.attributes && Object.keys(entry.attributes).length > 0) {
    lines.push("**Attributes:**");
    Object.entries(entry.attributes).forEach(([key, value]) => {
      if (value) {
        lines.push(`- ${key}: ${value}`);
      }
    });
  }

  if (entry.aliases && entry.aliases.length > 0) {
    lines.push(`**Also known as:** ${entry.aliases.join(", ")}`);
  }

  if (entry.coreDescription) {
    lines.push(`**Key traits:** ${entry.coreDescription}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Group codex entries by category.
 */
function groupByCategory(entries: CodexEntry[]): Record<string, CodexEntry[]> {
  return entries.reduce(
    (acc, entry) => {
      const cat = entry.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat]!.push(entry);
      return acc;
    },
    {} as Record<string, CodexEntry[]>,
  );
}

// =============================================================================
// TEXT EXTRACTION
// =============================================================================

/**
 * Extract plain text from Tiptap JSON content.
 * Safe async recursive function with a depth guard to prevent stack overflow.
 */
async function extractTextFromTiptap(
  content: unknown,
  depth = 0,
): Promise<string> {
  const MAX_DEPTH = 100;

  if (depth > MAX_DEPTH) {
    log.warn("Max recursion depth reached in extractTextFromTiptap");
    return "";
  }

  if (!content) return "";
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    if (content.length > 50) await yieldToMain();
    const parts = await Promise.all(
      content.map((item: unknown) => extractTextFromTiptap(item, depth + 1)),
    );
    return parts.join(" ");
  }

  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;

    if (obj["type"] === "mention" && obj["attrs"]) {
      const attrs = obj["attrs"] as Record<string, unknown>;
      return typeof attrs["label"] === "string" ? attrs["label"] : "";
    }

    if (typeof obj["text"] === "string") return obj["text"];
    if (obj["content"]) return extractTextFromTiptap(obj["content"], depth + 1);
  }

  return "";
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

/**
 * Tauri Context Assembly Service
 *
 * Assembles AI context from the current scene and any @mentioned codex entries,
 * using repository interfaces instead of direct Tauri IPC calls.
 *
 * Constructor dependencies:
 *   nodeRepository   — resolves Scene content (structure + file loading)
 *   codexRepository  — resolves CodexEntry records for @mention filtering
 */
export class TauriContextAssemblyService implements IContextAssemblyService {
  constructor(
    private readonly nodeRepository: INodeRepository,
    private readonly codexRepository: ICodexRepository,
  ) {}

  async assembleContext(options: ContextAssemblyOptions): Promise<string> {
    const { sceneId, seriesId } = options;

    let context = "";

    if (!sceneId) return context;

    try {
      // Resolve the scene node via the repository.
      // TauriNodeRepository.get() calls getStructure + loadScene internally
      // and returns a Scene with content already parsed as TiptapContent.
      const node = await this.nodeRepository.get(sceneId);

      if (!node || node.type !== "scene") {
        log.warn("Scene not found or node is not a scene", { sceneId });
        return context;
      }

      const scene = node;
      const sceneContent = scene.content; // already a TiptapContent object

      // Extract plain text for the CURRENT SCENE section
      const sceneText = await extractTextFromTiptap(sceneContent);

      // Extract @mention codex entry IDs from the scene content
      const mentionedIds = extractMentionIds(sceneContent);

      // Resolve mentioned codex entries from the series-level repository
      let mentionedEntries: CodexEntry[] = [];

      if (mentionedIds.length > 0) {
        if (seriesId) {
          try {
            const allCodex = await this.codexRepository.getBySeries(seriesId);
            mentionedEntries = allCodex.filter((e) =>
              mentionedIds.includes(e.id),
            );
          } catch (error) {
            log.warn("Failed to load codex entries for mentions", { error });
          }
        } else {
          log.warn("Series ID missing; skipping codex mention context", {
            sceneId,
            mentionedCount: mentionedIds.length,
          });
        }
      }

      // --- Build context string ---
      // Codex entries come FIRST so the AI has context before reading the scene.

      if (mentionedEntries.length > 0) {
        context += `## STORY BIBLE (Referenced in Scene)\n`;
        context += `The following entries are @mentioned. Maintain consistency with their details:\n\n`;

        const byCategory = groupByCategory(mentionedEntries);

        // Characters first (most important for narrative consistency)
        if (byCategory["character"]?.length) {
          context += `### CHARACTERS\n`;
          byCategory["character"].forEach((e) => {
            context += formatCodexEntry(e);
          });
          context += "\n";
        }

        if (byCategory["location"]?.length) {
          context += `### LOCATIONS\n`;
          byCategory["location"].forEach((e) => {
            context += formatCodexEntry(e);
          });
          context += "\n";
        }

        if (byCategory["item"]?.length) {
          context += `### ITEMS\n`;
          byCategory["item"].forEach((e) => {
            context += formatCodexEntry(e);
          });
          context += "\n";
        }

        if (byCategory["lore"]?.length) {
          context += `### LORE & WORLD RULES\n`;
          byCategory["lore"].forEach((e) => {
            context += formatCodexEntry(e);
          });
          context += "\n";
        }

        if (byCategory["subplot"]?.length) {
          context += `### SUBPLOTS\n`;
          byCategory["subplot"].forEach((e) => {
            context += formatCodexEntry(e);
          });
          context += "\n";
        }
      }

      // Scene content AFTER codex (so AI has context first)
      context += `## CURRENT SCENE\n${sceneText}\n\n`;
    } catch (error) {
      log.error("Failed to assemble context for scene", { sceneId, error });
    }

    return context;
  }
}
