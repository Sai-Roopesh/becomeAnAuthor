import { describe, expect, it } from "vitest";
import type {
  Act,
  Chapter,
  Scene,
  SceneCodexLink,
} from "@/domain/entities/types";
import { filterSceneBasedNodes } from "../filter-scene-based-nodes";

const now = 1;
const projectId = "project-1";

function createAct(id: string, title: string, order = 0): Act {
  return {
    id,
    type: "act",
    projectId,
    parentId: null,
    title,
    order,
    expanded: true,
    createdAt: now,
    updatedAt: now,
  };
}

function createChapter(
  id: string,
  parentId: string,
  title: string,
  order = 0,
): Chapter {
  return {
    id,
    type: "chapter",
    projectId,
    parentId,
    title,
    order,
    expanded: true,
    createdAt: now,
    updatedAt: now,
  };
}

function createScene(
  id: string,
  parentId: string,
  title: string,
  order = 0,
): Scene {
  return {
    id,
    type: "scene",
    projectId,
    parentId,
    title,
    order,
    expanded: true,
    createdAt: now,
    updatedAt: now,
    content: { type: "doc", content: [] },
    summary: "",
    status: "draft",
    wordCount: 0,
  };
}

function createLink(sceneId: string, codexId: string): SceneCodexLink {
  return {
    id: `${sceneId}-${codexId}`,
    sceneId,
    codexId,
    projectId,
    role: "mentioned",
    createdAt: now,
    updatedAt: now,
  };
}

describe("filterSceneBasedNodes", () => {
  it("keeps empty chapters visible when no filters are active", () => {
    const nodes = [
      createAct("act-1", "Act 1"),
      createChapter("chapter-1", "act-1", "Chapter 1"),
    ];

    const filtered = filterSceneBasedNodes({
      nodes,
      search: "",
      selectedCodexIds: [],
      categoryFilter: null,
      codexEntries: [],
      links: [],
    });

    expect(filtered.map((node) => node.id)).toEqual(["act-1", "chapter-1"]);
  });

  it("keeps empty chapters when search matches act or chapter title", () => {
    const nodes = [
      createAct("act-1", "Part One"),
      createChapter("chapter-1", "act-1", "Arrival"),
    ];

    const filtered = filterSceneBasedNodes({
      nodes,
      search: "arrival",
      selectedCodexIds: [],
      categoryFilter: null,
      codexEntries: [],
      links: [],
    });

    expect(filtered.map((node) => node.id)).toEqual(["act-1", "chapter-1"]);
  });

  it("hides empty chapters when query does not match titles", () => {
    const nodes = [
      createAct("act-1", "Part One"),
      createChapter("chapter-1", "act-1", "Arrival"),
    ];

    const filtered = filterSceneBasedNodes({
      nodes,
      search: "battle",
      selectedCodexIds: [],
      categoryFilter: null,
      codexEntries: [],
      links: [],
    });

    expect(filtered).toEqual([]);
  });

  it("hides empty chapters when codex filters are active", () => {
    const nodes = [
      createAct("act-1", "Act 1"),
      createChapter("chapter-1", "act-1", "Chapter 1"),
    ];

    const filtered = filterSceneBasedNodes({
      nodes,
      search: "",
      selectedCodexIds: ["codex-1"],
      categoryFilter: null,
      codexEntries: [],
      links: [],
    });

    expect(filtered).toEqual([]);
  });

  it("still includes scene chapters when codex links satisfy the filter", () => {
    const nodes = [
      createAct("act-1", "Act 1"),
      createChapter("chapter-1", "act-1", "Chapter 1"),
      createScene("scene-1", "chapter-1", "Scene 1"),
    ];

    const filtered = filterSceneBasedNodes({
      nodes,
      search: "",
      selectedCodexIds: ["codex-1"],
      categoryFilter: null,
      codexEntries: [],
      links: [createLink("scene-1", "codex-1")],
    });

    expect(filtered.map((node) => node.id)).toEqual([
      "act-1",
      "chapter-1",
      "scene-1",
    ]);
  });
});
