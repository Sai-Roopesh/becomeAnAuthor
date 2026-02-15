import type { ChatMessage } from "@/domain/entities/types";
import type { AIModelMessage } from "@/lib/ai/client";

interface RollingMemoryOptions {
  maxRecentMessages?: number;
  maxSummaryEntries?: number;
  maxSnippetChars?: number;
}

interface RollingMemoryResult {
  summaryMessage?: AIModelMessage;
  recentMessages: AIModelMessage[];
}

const DEFAULT_MAX_RECENT_MESSAGES = 10;
const DEFAULT_MAX_SUMMARY_ENTRIES = 30;
const DEFAULT_MAX_SNIPPET_CHARS = 220;

function compactText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxChars);
  const boundary = Math.max(sliced.lastIndexOf(" "), sliced.lastIndexOf("."));
  if (boundary > maxChars * 0.6) {
    return `${sliced.slice(0, boundary).trim()}...`;
  }

  return `${sliced.trim()}...`;
}

function toModelMessage(message: ChatMessage): AIModelMessage {
  return {
    role: message.role,
    content: message.content,
  };
}

export function buildRollingMemory(
  history: ChatMessage[],
  options: RollingMemoryOptions = {},
): RollingMemoryResult {
  const maxRecentMessages =
    options.maxRecentMessages ?? DEFAULT_MAX_RECENT_MESSAGES;
  const maxSummaryEntries =
    options.maxSummaryEntries ?? DEFAULT_MAX_SUMMARY_ENTRIES;
  const maxSnippetChars = options.maxSnippetChars ?? DEFAULT_MAX_SNIPPET_CHARS;

  const normalized = history
    .filter((msg) => msg.content.trim().length > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (normalized.length === 0) {
    return { recentMessages: [] };
  }

  const splitIndex = Math.max(0, normalized.length - maxRecentMessages);
  const older = normalized.slice(0, splitIndex);
  const recent = normalized.slice(splitIndex).map(toModelMessage);

  if (older.length === 0) {
    return { recentMessages: recent };
  }

  const summaryLines = older.slice(-maxSummaryEntries).map((message, idx) => {
    const speaker = message.role === "user" ? "User" : "Assistant";
    const snippet = compactText(message.content, maxSnippetChars);
    return `${idx + 1}. ${speaker}: ${snippet}`;
  });

  const summaryMessage: AIModelMessage = {
    role: "system",
    content: [
      "Conversation memory summary of earlier turns (compressed):",
      ...summaryLines,
      "Respect this summary, then prioritize the explicit recent turns and latest user request.",
    ].join("\n"),
  };

  return {
    summaryMessage,
    recentMessages: recent,
  };
}
