import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { convertNovelZipToSeriesBackup } from "../novel-zip-converter";

async function createZipFile(
  name: string,
  setup: (zip: JSZip) => void,
): Promise<File> {
  const zip = new JSZip();
  setup(zip);
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], name, { type: "application/zip" });
}

describe("convertNovelZipToSeriesBackup", () => {
  it("converts subplot markdown fallback, codex, and chats into series payload", async () => {
    const file = await createZipFile("novel-export.zip", (zip) => {
      zip.file(
        "subplots/outline-1/entry.md",
        [
          "---",
          "type: subplot",
          "name: Novel Outline",
          "---",
          "# Chapter One",
          "",
          "The first chapter body.",
          "",
          "* * *",
          "",
          "The second chapter scene body.",
        ].join("\n"),
      );

      zip.file(
        "characters/alice-1/metadata.json",
        JSON.stringify({
          id: "alice-1",
          attributes: {
            type: "character",
            name: "Alice",
            aliases: ["Al"],
            tags: ["lead"],
            alwaysIncludeInContext: true,
            doNotTrack: false,
            noAutoInclude: false,
          },
          relationships: { nestedEntries: [] },
          links: { externalReferences: [] },
        }),
      );
      zip.file(
        "characters/alice-1/entry.md",
        ["---", "type: character", "name: Alice", "---", "Alice profile."].join(
          "\n",
        ),
      );

      zip.file(
        "chats/2025-10-24 session.md",
        [
          "---",
          'title: "Import Thread"',
          "---",
          "## User",
          "Hello",
          "",
          "## AI",
          "Hi there",
        ].join("\n"),
      );
    });

    const converted = await convertNovelZipToSeriesBackup(file);

    expect(converted.backup.backupType).toBe("series");
    expect(converted.backup.projects).toHaveLength(1);
    expect(converted.backup.projects[0]?.nodes?.length).toBeGreaterThan(0);
    expect(
      Object.keys(converted.backup.projects[0]?.sceneFiles ?? {}),
    ).not.toHaveLength(0);
    const firstAct = converted.backup.projects[0]?.nodes?.[0] as
      | { children?: unknown[] }
      | undefined;
    const firstChapter = firstAct?.children?.[0] as
      | { children?: unknown[] }
      | undefined;
    expect(firstChapter?.children).toHaveLength(2);
    expect(converted.backup.codex?.[0]).toMatchObject({
      id: "alice-1",
      name: "Alice",
      category: "character",
    });
    expect(converted.backup.projects[0]?.chats).toHaveLength(1);
    expect(converted.backup.projects[0]?.messages).toHaveLength(2);
    expect(converted.warnings.length).toBeGreaterThan(0);
  });

  it("rejects archive without manuscript inputs", async () => {
    const file = await createZipFile("broken.zip", (zip) => {
      zip.file("characters/alice-1/metadata.json", '{"id":"alice-1"}');
    });

    await expect(convertNovelZipToSeriesBackup(file)).rejects.toThrow(
      /missing manuscript source/i,
    );
  });

  it("uses scene headings to title split scenes", async () => {
    const file = await createZipFile("scene-headings.zip", (zip) => {
      zip.file(
        "subplots/outline-1/entry.md",
        [
          "---",
          "type: subplot",
          "name: Novel Outline",
          "---",
          "Scene 1: Arrival",
          "",
          "Roopesh arrives.",
          "",
          "* * *",
          "",
          "Scene 2: Orientation",
          "",
          "Ananya enters.",
        ].join("\n"),
      );
    });

    const converted = await convertNovelZipToSeriesBackup(file);
    const firstAct = converted.backup.projects[0]?.nodes?.[0] as
      | { children?: unknown[] }
      | undefined;
    const firstChapter = firstAct?.children?.[0] as
      | { children?: Array<{ title?: string }> }
      | undefined;

    expect(firstChapter?.children).toHaveLength(2);
    expect(firstChapter?.children?.[0]?.title).toBe("Arrival");
    expect(firstChapter?.children?.[1]?.title).toBe("Orientation");
  });
});
