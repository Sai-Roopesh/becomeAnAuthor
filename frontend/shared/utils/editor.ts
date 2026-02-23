/**
 * Tiptap Editor Utilities
 * Functions for extracting and manipulating Tiptap editor content
 */

import type { TiptapContent, TiptapNode } from "@/shared/types/tiptap";

/**
 * Extract plain text from Tiptap content (recursive)
 */
export function extractTextFromContent(
  content: TiptapContent | TiptapNode | null | undefined,
): string {
  if (!content) return "";

  if (content.type === "mention") {
    return getMentionText(content);
  }

  // Handle text nodes
  if ("text" in content && typeof content.text === "string") {
    return content.text;
  }

  // Handle nodes with content array
  if ("content" in content && Array.isArray(content.content)) {
    return content.content.map((node) => extractTextFromContent(node)).join("");
  }

  return "";
}

/**
 * Extract plain text from Tiptap JSON (alias for better naming)
 * Used in: scene summarization, export, copy prose
 */
export function extractTextFromTiptapJSON(
  content: TiptapContent | null | undefined,
): string {
  if (!content?.content) return "";

  const extractNode = (node: TiptapNode): string => {
    if (node.type === "mention") {
      return getMentionText(node);
    }

    if ("text" in node && typeof node.text === "string") {
      return node.text;
    }

    if (!("content" in node) || !Array.isArray(node.content)) {
      return "";
    }

    const children = node.content
      .map(extractNode)
      .filter((text) => text.length > 0);
    const joinedChildren = children.join("");

    switch (node.type) {
      case "hardBreak":
        return "\n";
      case "bulletList":
      case "orderedList":
        return children.join("\n");
      case "listItem":
        return joinedChildren.trim();
      case "table":
        return children.join("\n");
      case "tableRow":
        return children.join("\t");
      default:
        return joinedChildren;
    }
  };

  return content.content
    .map((node) => extractNode(node).trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}

function getMentionText(node: TiptapNode): string {
  if (!("attrs" in node) || !node.attrs || typeof node.attrs !== "object") {
    return "";
  }

  const attrs = node.attrs as Record<string, unknown>;
  const rawValue =
    pickMentionAttr(attrs["label"]) ??
    pickMentionAttr(attrs["name"]) ??
    pickMentionAttr(attrs["title"]) ??
    pickMentionAttr(attrs["id"]);
  return rawValue ?? "";
}

function pickMentionAttr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Count words in Tiptap JSON content
 */
export function countWordsInTiptapJSON(
  json: TiptapContent | null | undefined,
): number {
  const text = extractTextFromTiptapJSON(json);

  // Remove extra whitespace and split by whitespace
  const words = text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((word) => word.length > 0);

  return words.length;
}
