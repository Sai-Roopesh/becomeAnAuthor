import { getModelSpec } from "@/lib/config/model-specs";

const CHARS_PER_TOKEN = 4;
const MIN_CONTEXT_BUDGET_TOKENS = 1500;
const MAX_CONTEXT_BUDGET_CAP_TOKENS = 16000;
const MIN_TRUNCATED_BLOCK_TOKENS = 250;
const DEFAULT_MAX_BLOCKS = 12;

export type ContextSourceType =
  | "novel"
  | "outline"
  | "act"
  | "chapter"
  | "scene"
  | "codex";

export interface ContextSource {
  id: string;
  type: ContextSourceType;
  label: string;
  content: string;
  updatedAt?: number;
}

export interface PackedContextBlock extends ContextSource {
  score: number;
  tokens: number;
  truncated: boolean;
}

export interface ContextPackOptions {
  query: string;
  model: string;
  maxContextTokens?: number;
  reserveResponseTokens?: number;
  maxBlocks?: number;
}

export interface ContextPackResult {
  blocks: PackedContextBlock[];
  serialized: string;
  totalTokens: number;
  tokenBudget: number;
  truncated: boolean;
  excluded: string[];
  warningMessage?: string;
  signature: string;
}

interface ScoredSource extends ContextSource {
  score: number;
  tokens: number;
}

function sanitizeInline(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeQueryTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function basePriority(type: ContextSourceType): number {
  switch (type) {
    case "codex":
      return 7;
    case "scene":
      return 6;
    case "chapter":
      return 5;
    case "act":
      return 4;
    case "outline":
      return 3;
    case "novel":
      return 2;
    default:
      return 1;
  }
}

function lexicalScore(queryTerms: string[], source: ContextSource): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  const normalized = `${source.label}\n${source.content}`.toLowerCase();
  let termHits = 0;
  let weightedHits = 0;

  for (const term of queryTerms) {
    if (!normalized.includes(term)) {
      continue;
    }

    termHits += 1;
    const inLabel = source.label.toLowerCase().includes(term);
    weightedHits += inLabel ? 1.5 : 1;
  }

  const termCoverage = termHits / queryTerms.length;
  const weightedCoverage = weightedHits / queryTerms.length;

  return termCoverage * 5 + weightedCoverage * 3;
}

function scoreSource(source: ContextSource, queryTerms: string[]): number {
  return basePriority(source.type) + lexicalScore(queryTerms, source);
}

function truncateToTokens(text: string, targetTokens: number): string {
  const targetChars = targetTokens * CHARS_PER_TOKEN;
  if (text.length <= targetChars) {
    return text;
  }

  let sliced = text.slice(0, targetChars);
  const lastBoundary = Math.max(
    sliced.lastIndexOf("\n"),
    sliced.lastIndexOf(" "),
  );
  if (lastBoundary > targetChars * 0.75) {
    sliced = sliced.slice(0, lastBoundary);
  }

  return `${sliced.trim()}\n[...]`;
}

function serializeBlocks(blocks: PackedContextBlock[]): string {
  return blocks
    .map((block, index) => {
      const header = [
        `[EVIDENCE ${index + 1}]`,
        `type=${block.type}`,
        `id=${sanitizeInline(block.id)}`,
        `label=${sanitizeInline(block.label)}`,
        `score=${block.score.toFixed(3)}`,
        `tokens=${block.tokens}`,
        `truncated=${block.truncated ? "yes" : "no"}`,
      ].join(" | ");

      const provenance = block.updatedAt
        ? `source_updated_at=${new Date(block.updatedAt).toISOString()}`
        : "source_updated_at=unknown";

      return `${header}\n${provenance}\n---\n${block.content}`;
    })
    .join("\n\n");
}

function buildSignature(blocks: PackedContextBlock[]): string {
  const payload = blocks
    .map(
      (block) =>
        `${block.type}:${block.id}:${block.updatedAt ?? 0}:${block.tokens}`,
    )
    .join("|");
  return stableHash(payload);
}

function resolveTokenBudget(options: ContextPackOptions): number {
  const modelSpec = getModelSpec(options.model);
  const reserved =
    options.reserveResponseTokens ??
    Math.max(
      modelSpec.recommendedOutput,
      modelSpec.maxOutputTokens > 0 ? modelSpec.maxOutputTokens / 2 : 0,
    );

  const modelAvailable = Math.max(
    MIN_CONTEXT_BUDGET_TOKENS,
    modelSpec.maxInputTokens - Math.ceil(reserved),
  );

  const requested = options.maxContextTokens ?? modelAvailable;

  return Math.max(
    MIN_CONTEXT_BUDGET_TOKENS,
    Math.min(requested, modelAvailable, MAX_CONTEXT_BUDGET_CAP_TOKENS),
  );
}

export function packContext(
  sources: ContextSource[],
  options: ContextPackOptions,
): ContextPackResult {
  const tokenBudget = resolveTokenBudget(options);
  const maxBlocks = options.maxBlocks ?? DEFAULT_MAX_BLOCKS;
  const queryTerms = normalizeQueryTerms(options.query);

  const scored: ScoredSource[] = sources
    .filter((source) => source.content.trim().length > 0)
    .map((source) => ({
      ...source,
      score: scoreSource(source, queryTerms),
      tokens: estimateTokens(source.content),
    }))
    .sort((a, b) => b.score - a.score);

  const blocks: PackedContextBlock[] = [];
  const excluded: string[] = [];
  let remaining = tokenBudget;

  for (const source of scored) {
    if (blocks.length >= maxBlocks) {
      excluded.push(`${source.type}:${source.id} (exceeds max block count)`);
      continue;
    }

    if (source.tokens <= remaining) {
      blocks.push({ ...source, truncated: false });
      remaining -= source.tokens;
      continue;
    }

    if (remaining >= MIN_TRUNCATED_BLOCK_TOKENS) {
      const truncatedContent = truncateToTokens(source.content, remaining);
      const truncatedTokens = estimateTokens(truncatedContent);
      blocks.push({
        ...source,
        content: truncatedContent,
        tokens: truncatedTokens,
        truncated: true,
      });
      remaining -= truncatedTokens;
    } else {
      excluded.push(`${source.type}:${source.id} (insufficient token budget)`);
    }

    if (remaining < MIN_TRUNCATED_BLOCK_TOKENS) {
      break;
    }
  }

  const totalTokens = blocks.reduce((sum, block) => sum + block.tokens, 0);
  const truncated =
    blocks.some((block) => block.truncated) || excluded.length > 0;
  const serialized = serializeBlocks(blocks);
  const warningMessage = truncated
    ? `Context packed to ${totalTokens.toLocaleString()} tokens (${blocks.length} blocks). ${excluded.length} source(s) excluded.`
    : undefined;

  return {
    blocks,
    serialized,
    totalTokens,
    tokenBudget,
    truncated,
    excluded,
    ...(warningMessage && { warningMessage }),
    signature: buildSignature(blocks),
  };
}

export function estimateTextTokens(text: string): number {
  return estimateTokens(text);
}
