import JSZip from "jszip";
import type { ValidatedExportedSeries } from "@/shared/schemas/import-schema";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("NovelZipConverter");

const ACT_HEADING_REGEX = /^act\s+\d+/i;
const CHAPTER_HEADING_REGEX = /^chapter\s+\d+(?:\s*[:\-]\s*.*)?$/i;
const SCENE_SEPARATOR_REGEX = /^(?:\*+\s*){3,}$|^(?:-\s*){3,}$|^(?:_+\s*){3,}$/;
const SCENE_HEADING_REGEX =
  /^(?:#+\s*)?(?:scene|part)\s+[\w.-]+(?:\s*[:\-]\s*.*)?$/i;

interface ChapterDraft {
  title: string;
  lines: string[];
}

interface ActDraft {
  title: string;
  chapters: ChapterDraft[];
}

interface SceneDraft {
  title?: string;
  lines: string[];
}

interface ConvertedProjectPayload {
  project: {
    id: string;
    title: string;
    [key: string]: unknown;
  };
  nodes: Array<Record<string, unknown>>;
  sceneFiles: Record<string, string>;
  snippets: Array<Record<string, unknown>>;
  chats: ConvertedChatThread[];
  messages: ConvertedChatMessage[];
}

interface ConvertedChatThread {
  id: string;
  projectId: string;
  name: string;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ConvertedChatMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ConvertedCodexEntry {
  id: string;
  projectId: string;
  name: string;
  category: string;
  aliases: string[];
  tags: string[];
  description: string;
  attributes: Record<string, string>;
  references: string[];
  settings: Record<string, unknown>;
  aiContext?: string;
  trackMentions?: boolean;
  externalLinks?: string[];
  createdAt: number;
  updatedAt: number;
}

interface ConvertedRelation {
  id: string;
  parentId: string;
  childId: string;
  projectId: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NovelZipConversionResult {
  backup: ValidatedExportedSeries;
  warnings: string[];
}

function createId(prefix: string): string {
  const candidate =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}${candidate}`;
}

function sanitizeTitle(input: string | undefined, fallback: string): string {
  const normalized = (input ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.slice(0, 200);
}

function sanitizeBackendSafeTitle(
  input: string | undefined,
  fallback: string,
): string {
  const normalized = sanitizeTitle(input, fallback)
    .replace(/[\/\\*?<>|:"\0]/g, " ")
    .replace(/^\.+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || normalized === "." || normalized === "..") {
    return fallback;
  }

  return normalized.slice(0, 200);
}

function isSafeZipPath(path: string): boolean {
  if (!path || path.startsWith("/") || path.startsWith("\\")) return false;
  if (path.includes("..")) return false;
  return true;
}

function escapeYamlString(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stripFrontmatter(markdown: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const trimmed = markdown.replace(/\r\n/g, "\n");
  if (!trimmed.startsWith("---\n")) {
    return { frontmatter: {}, body: trimmed.trim() };
  }

  const end = trimmed.indexOf("\n---\n", 4);
  if (end === -1) {
    return { frontmatter: {}, body: trimmed.trim() };
  }

  const frontmatterRaw = trimmed.slice(4, end).trim();
  const body = trimmed.slice(end + 5).trim();
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterRaw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^"|"$/g, "");
    if (!key) continue;
    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function parseDateFromFilename(baseName: string, fallbackMs: number): number {
  const dateMatch = baseName.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return fallbackMs;

  const year = dateMatch[1];
  const month = dateMatch[2];
  const day = dateMatch[3];
  const parsed = Date.parse(`${year}-${month}-${day}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function categoryFromType(rawType: unknown): string {
  const value = String(rawType ?? "")
    .trim()
    .toLowerCase();
  if (value === "character") return "character";
  if (value === "location") return "location";
  if (value === "lore") return "lore";
  if (value === "subplot" || value === "subplots") return "subplot";
  if (value === "item") return "item";
  return "lore";
}

function buildSceneMarkdown(
  sceneId: string,
  sceneTitle: string,
  sceneOrder: number,
  textBody: string,
  createdAtIso: string,
): string {
  const body = textBody.trim();
  const wordCount = body
    ? body.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length
    : 0;

  return [
    "---",
    `id: ${sceneId}`,
    `title: "${escapeYamlString(sceneTitle)}"`,
    `order: ${sceneOrder}`,
    "status: draft",
    `wordCount: ${wordCount}`,
    "pov: null",
    "subtitle: null",
    "labels: []",
    "excludeFromAI: false",
    'summary: ""',
    "archived: false",
    `createdAt: ${createdAtIso}`,
    `updatedAt: ${createdAtIso}`,
    "---",
    "",
    body,
    "",
  ].join("\n");
}

function createFallbackActs(text: string): ActDraft[] {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  return [
    {
      title: "Act 1",
      chapters: [
        {
          title: "Chapter 1",
          lines: normalizedText ? normalizedText.split("\n") : [],
        },
      ],
    },
  ];
}

function normalizeSceneHeadingTitle(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^(scene|part)\s+/i, "")
    .replace(/^[\dIVXLCDM.\-: ]+/i, "")
    .trim();
}

function hasSceneBodyContent(lines: string[]): boolean {
  return lines.some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^#+\s+/.test(trimmed)) return false;
    return true;
  });
}

function splitChapterIntoScenes(chapter: ChapterDraft): SceneDraft[] {
  const scenes: SceneDraft[] = [];
  let pendingTitle: string | undefined;
  let currentLines: string[] = [];

  const flushScene = () => {
    const hasContent = hasSceneBodyContent(currentLines);
    if (!hasContent) {
      currentLines = [];
      return;
    }

    scenes.push({
      ...(pendingTitle !== undefined && { title: pendingTitle }),
      lines: currentLines,
    });
    pendingTitle = undefined;
    currentLines = [];
  };

  for (const rawLine of chapter.lines) {
    const line = rawLine.trim();

    if (line && SCENE_SEPARATOR_REGEX.test(line)) {
      flushScene();
      continue;
    }

    if (line && SCENE_HEADING_REGEX.test(line)) {
      flushScene();
      pendingTitle = normalizeSceneHeadingTitle(line) || line;
      continue;
    }

    currentLines.push(rawLine);
  }

  flushScene();

  return scenes.length > 0
    ? scenes
    : [
        {
          lines: chapter.lines,
        },
      ];
}

function buildActsFromDocxText(docxText: string): {
  seriesTitle: string;
  acts: ActDraft[];
} {
  const normalized = docxText.replace(/\r\n/g, "\n");
  const rawLines = normalized.split("\n").map((line) => line.trimEnd());
  const nonEmptyLines = rawLines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return {
      seriesTitle: "Imported Novel",
      acts: createFallbackActs(""),
    };
  }

  const firstLine = nonEmptyLines[0]?.trim() ?? "";
  const firstNonEmptyRawIndex = rawLines.findIndex(
    (line) => line.trim().length > 0,
  );
  const firstLineIsHeading =
    ACT_HEADING_REGEX.test(firstLine) || CHAPTER_HEADING_REGEX.test(firstLine);
  const seriesTitle =
    !firstLineIsHeading && firstLine.length <= 140
      ? sanitizeTitle(firstLine, "Imported Novel")
      : "Imported Novel";

  const linesToParse =
    !firstLineIsHeading && firstLine.length <= 140
      ? rawLines.slice(firstNonEmptyRawIndex + 1)
      : rawLines;

  const acts: ActDraft[] = [];
  let currentAct: ActDraft | null = null;
  let currentChapter: ChapterDraft | null = null;

  const flushChapter = () => {
    if (!currentChapter) return;
    const hasContent = currentChapter.lines.some((line) => line.trim());
    if (!hasContent && currentChapter.title === "Chapter 1") {
      currentChapter = null;
      return;
    }
    if (!currentAct) {
      currentAct = { title: "Act 1", chapters: [] };
    }
    currentAct.chapters.push(currentChapter);
    currentChapter = null;
  };

  const flushAct = () => {
    if (!currentAct) return;
    if (currentAct.chapters.length > 0) {
      acts.push(currentAct);
    }
    currentAct = null;
  };

  for (const line of linesToParse) {
    const trimmed = line.trim();

    if (trimmed && ACT_HEADING_REGEX.test(trimmed)) {
      flushChapter();
      flushAct();
      currentAct = { title: trimmed, chapters: [] };
      continue;
    }

    if (trimmed && CHAPTER_HEADING_REGEX.test(trimmed)) {
      flushChapter();
      if (!currentAct) {
        currentAct = { title: "Act 1", chapters: [] };
      }
      currentChapter = { title: trimmed, lines: [] };
      continue;
    }

    if (!currentChapter) {
      if (!currentAct) {
        currentAct = { title: "Act 1", chapters: [] };
      }
      currentChapter = { title: "Chapter 1", lines: [] };
    }

    currentChapter.lines.push(line);
  }

  flushChapter();
  flushAct();

  if (acts.length === 0) {
    return {
      seriesTitle,
      acts: createFallbackActs(nonEmptyLines.join("\n\n")),
    };
  }

  return { seriesTitle, acts };
}

async function extractDocxText(entry: JSZip.JSZipObject): Promise<string> {
  const buffer = await entry.async("arraybuffer");
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value?.trim() ?? "";
}

function buildProjectFromActs(
  acts: ActDraft[],
  projectTitle: string,
  createdAtIso: string,
): Pick<ConvertedProjectPayload, "nodes" | "sceneFiles"> {
  const nodes: Array<Record<string, unknown>> = [];
  const sceneFiles: Record<string, string> = {};

  acts.forEach((act, actIndex) => {
    const actId = createId("act-");
    const chapterNodes: Array<Record<string, unknown>> = [];

    act.chapters.forEach((chapter, chapterIndex) => {
      const chapterId = createId("chapter-");
      const chapterTitle = sanitizeBackendSafeTitle(
        chapter.title,
        `Chapter ${chapterIndex + 1}`,
      );
      const sceneDrafts = splitChapterIntoScenes(chapter);
      const sceneNodes: Array<Record<string, unknown>> = [];

      sceneDrafts.forEach((sceneDraft, sceneIndex) => {
        const sceneId = createId("scene-");
        const sceneFileName = `${sceneId}.md`;
        const sceneFallbackTitle =
          sceneDrafts.length > 1
            ? `${chapterTitle} - Scene ${sceneIndex + 1}`
            : chapterTitle;
        const sceneTitle = sanitizeBackendSafeTitle(
          sceneDraft.title,
          sceneFallbackTitle,
        );
        const sceneBody = sceneDraft.lines.join("\n").trim();

        sceneFiles[sceneFileName] = buildSceneMarkdown(
          sceneId,
          sceneTitle,
          sceneIndex,
          sceneBody,
          createdAtIso,
        );

        sceneNodes.push({
          id: sceneId,
          type: "scene",
          title: sceneTitle,
          order: sceneIndex,
          children: [],
          file: sceneFileName,
        });
      });

      const chapterNode: Record<string, unknown> = {
        id: chapterId,
        type: "chapter",
        title: chapterTitle,
        order: chapterIndex,
        children: sceneNodes,
      };

      chapterNodes.push(chapterNode);
    });

    const actNode: Record<string, unknown> = {
      id: actId,
      type: "act",
      title: sanitizeBackendSafeTitle(act.title, `Act ${actIndex + 1}`),
      order: actIndex,
      children: chapterNodes,
    };

    nodes.push(actNode);
  });

  if (nodes.length === 0) {
    const fallbackSceneId = createId("scene-");
    const fallbackSceneFile = `${fallbackSceneId}.md`;
    sceneFiles[fallbackSceneFile] = buildSceneMarkdown(
      fallbackSceneId,
      `${projectTitle} - Imported`,
      0,
      "",
      createdAtIso,
    );

    nodes.push({
      id: createId("act-"),
      type: "act",
      title: "Act 1",
      order: 0,
      children: [
        {
          id: createId("chapter-"),
          type: "chapter",
          title: "Chapter 1",
          order: 0,
          children: [
            {
              id: fallbackSceneId,
              type: "scene",
              title: `${projectTitle} - Imported`,
              order: 0,
              children: [],
              file: fallbackSceneFile,
            },
          ],
        },
      ],
    });
  }

  return { nodes, sceneFiles };
}

async function collectChatDataAsync(
  zip: JSZip,
  sourceProjectId: string,
  nowMs: number,
): Promise<Pick<ConvertedProjectPayload, "chats" | "messages">> {
  const chatEntries = Object.keys(zip.files)
    .filter((name) => /^chats\/.+\.md$/i.test(name) && !zip.files[name]?.dir)
    .sort((a, b) => a.localeCompare(b));

  const chats: ConvertedChatThread[] = [];
  const messages: ConvertedChatMessage[] = [];

  for (const chatPath of chatEntries) {
    const entry = zip.file(chatPath);
    if (!entry) continue;

    const text = await entry.async("string");
    const { frontmatter, body } = stripFrontmatter(text);
    const baseName = chatPath.replace(/^chats\//, "").replace(/\.md$/i, "");
    const createdAt = parseDateFromFilename(baseName, nowMs);
    const threadId = createId("thread-");
    const threadName = sanitizeTitle(frontmatter["title"], baseName);

    const lines = body.split(/\r?\n/);
    let role: "user" | "assistant" | null = null;
    let buffer: string[] = [];
    let sequence = 0;

    const flushMessage = () => {
      if (!role) return;
      const content = buffer.join("\n").trim();
      if (!content) {
        buffer = [];
        return;
      }

      messages.push({
        id: createId("msg-"),
        threadId,
        role,
        content,
        timestamp: createdAt + sequence * 1000,
      });
      sequence += 1;
      buffer = [];
    };

    for (const line of lines) {
      const roleMatch = line.match(/^##\s+(User|AI)\s*$/i);
      if (roleMatch) {
        flushMessage();
        role = roleMatch[1]?.toLowerCase() === "user" ? "user" : "assistant";
        continue;
      }
      if (!role) continue;
      buffer.push(line);
    }
    flushMessage();

    const lastTimestamp =
      (messages.filter((m) => m["threadId"] === threadId).at(-1)?.[
        "timestamp"
      ] as number | undefined) ?? createdAt;

    chats.push({
      id: threadId,
      projectId: sourceProjectId,
      name: threadName,
      pinned: false,
      archived: false,
      createdAt,
      updatedAt: lastTimestamp,
    });
  }

  return { chats, messages };
}

async function collectCodexData(
  zip: JSZip,
  sourceProjectId: string,
  nowMs: number,
): Promise<{
  codex: ConvertedCodexEntry[];
  codexRelations: ConvertedRelation[];
}> {
  const metadataEntries = Object.keys(zip.files)
    .filter((name) =>
      /^(characters|locations|lore|subplots)\/[^/]+\/metadata\.json$/i.test(
        name,
      ),
    )
    .sort((a, b) => a.localeCompare(b));

  const codex: ConvertedCodexEntry[] = [];
  const relationSeeds: Array<{ parentId: string; childId: string }> = [];

  for (const metadataPath of metadataEntries) {
    const metadataFile = zip.file(metadataPath);
    if (!metadataFile) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(await metadataFile.async("string")) as Record<
        string,
        unknown
      >;
    } catch {
      throw new Error(`Invalid metadata JSON: ${metadataPath}`);
    }

    const attributes = (parsed["attributes"] ?? {}) as Record<string, unknown>;
    const relationships = (parsed["relationships"] ?? {}) as Record<
      string,
      unknown
    >;
    const links = (parsed["links"] ?? {}) as Record<string, unknown>;
    const entryId = String(parsed["id"] ?? createId("codex-"));
    const category = categoryFromType(attributes["type"]);
    const entryPath = metadataPath.replace(/metadata\.json$/i, "entry.md");
    const entryFile = zip.file(entryPath);

    let description = "";
    if (entryFile) {
      const markdown = await entryFile.async("string");
      description = stripFrontmatter(markdown).body;
    }

    const aliasesRaw = Array.isArray(attributes["aliases"])
      ? (attributes["aliases"] as unknown[])
      : [];
    const tagsRaw = Array.isArray(attributes["tags"])
      ? (attributes["tags"] as unknown[])
      : [];
    const externalReferences = Array.isArray(links["externalReferences"])
      ? (links["externalReferences"] as unknown[])
      : [];

    const attributesMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (
        key === "type" ||
        key === "name" ||
        key === "aliases" ||
        key === "tags" ||
        key === "alwaysIncludeInContext" ||
        key === "doNotTrack" ||
        key === "noAutoInclude"
      ) {
        continue;
      }
      if (value === null || value === undefined) continue;
      attributesMap[key] =
        typeof value === "string" ? value : JSON.stringify(value);
    }

    const alwaysIncludeInContext = Boolean(
      attributes["alwaysIncludeInContext"],
    );
    const doNotTrack = Boolean(attributes["doNotTrack"]);
    const noAutoInclude = Boolean(attributes["noAutoInclude"]);

    const codexEntry: ConvertedCodexEntry = {
      id: entryId,
      projectId: sourceProjectId,
      name: sanitizeTitle(
        String(attributes["name"] ?? "").trim(),
        entryPath.split("/").at(-2) ?? "Entry",
      ),
      category,
      aliases: aliasesRaw.map((alias) => String(alias)).filter(Boolean),
      tags: tagsRaw.map((tag) => String(tag)).filter(Boolean),
      description: description.trim(),
      attributes: attributesMap,
      references: [],
      settings: {
        isGlobal: false,
        doNotTrack,
      },
      aiContext: alwaysIncludeInContext
        ? "always"
        : noAutoInclude
          ? "never"
          : "detected",
      trackMentions: !doNotTrack,
      externalLinks: externalReferences.map((value) => String(value)),
      createdAt: nowMs,
      updatedAt: nowMs,
    };

    codex.push(codexEntry);

    const nestedEntries = Array.isArray(relationships["nestedEntries"])
      ? (relationships["nestedEntries"] as unknown[])
      : [];
    for (const child of nestedEntries) {
      const childId = String(child ?? "").trim();
      if (!childId) continue;
      relationSeeds.push({ parentId: entryId, childId });
    }
  }

  const knownIds = new Set(codex.map((entry) => entry.id));
  const codexRelations: ConvertedRelation[] = relationSeeds
    .filter((seed) => knownIds.has(seed.parentId) && knownIds.has(seed.childId))
    .map((seed) => ({
      id: createId("rel-"),
      parentId: seed.parentId,
      childId: seed.childId,
      projectId: sourceProjectId,
      label: "related",
      createdAt: nowMs,
      updatedAt: nowMs,
    }));

  return { codex, codexRelations };
}

export async function convertNovelZipToSeriesBackup(
  file: File,
): Promise<NovelZipConversionResult> {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Unsupported archive. Please choose a .zip file.");
  }

  const warnings: string[] = [];
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const sourceSeriesId = createId("source-series-");
  const sourceProjectId = createId("source-project-");

  const zip = await JSZip.loadAsync(await file.arrayBuffer(), {
    checkCRC32: true,
    createFolders: false,
  });

  for (const path of Object.keys(zip.files)) {
    if (!isSafeZipPath(path)) {
      throw new Error(
        "Archive contains unsafe file paths and cannot be imported.",
      );
    }
  }

  const docxEntry = zip.file("novel.docx");
  const subplotMarkdownEntries = Object.keys(zip.files)
    .filter((name) => /^subplots\/[^/]+\/entry\.md$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (!docxEntry && subplotMarkdownEntries.length === 0) {
    throw new Error(
      "Unsupported novel archive: missing manuscript source (novel.docx or subplots/*/entry.md).",
    );
  }

  let parsedTitle = "";
  let acts: ActDraft[] = [];

  if (docxEntry) {
    try {
      const docxText = await extractDocxText(docxEntry);
      const parsed = buildActsFromDocxText(docxText);
      parsedTitle = parsed.seriesTitle;
      acts = parsed.acts;
    } catch (error) {
      log.error("DOCX extraction failed, falling back to markdown", error);
      warnings.push(
        "Could not parse novel.docx. Falling back to subplot markdown content.",
      );
    }
  } else {
    warnings.push("novel.docx not found. Using subplot markdown content.");
  }

  if (acts.length === 0) {
    const fallbackBodies: string[] = [];
    for (const markdownPath of subplotMarkdownEntries) {
      const markdownEntry = zip.file(markdownPath);
      if (!markdownEntry) continue;
      const markdown = await markdownEntry.async("string");
      const { frontmatter, body } = stripFrontmatter(markdown);
      const sectionTitle = frontmatter["name"]?.trim() || markdownPath;
      fallbackBodies.push(`# ${sectionTitle}\n\n${body.trim()}`);
    }
    acts = createFallbackActs(fallbackBodies.join("\n\n"));
  }

  const seriesTitle = sanitizeBackendSafeTitle(parsedTitle, "Imported Novel");
  const projectTitle = seriesTitle;

  const { nodes, sceneFiles } = buildProjectFromActs(
    acts,
    projectTitle,
    nowIso,
  );
  const { codex, codexRelations } = await collectCodexData(
    zip,
    sourceProjectId,
    nowMs,
  );
  const { chats, messages } = await collectChatDataAsync(
    zip,
    sourceProjectId,
    nowMs,
  );

  const projectPayload: ConvertedProjectPayload = {
    project: {
      id: sourceProjectId,
      title: projectTitle,
      author: "",
      description: "",
      path: `/imported/${file.name}`,
      archived: false,
      language: null,
      cover_image: null,
      series_id: sourceSeriesId,
      series_index: "Book 1",
      created_at: nowIso,
      updated_at: nowIso,
    },
    nodes,
    sceneFiles,
    snippets: [],
    chats,
    messages,
  };

  const backup: ValidatedExportedSeries = {
    version: 3,
    backupType: "series",
    exportedAt: nowIso,
    series: {
      id: sourceSeriesId,
      title: seriesTitle,
      description: "",
      author: "",
      genre: null,
      status: "planned",
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    projects: [projectPayload],
    codex,
    codexRelations,
  };

  return {
    backup,
    warnings,
  };
}
