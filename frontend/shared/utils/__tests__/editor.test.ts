import { describe, expect, it } from "vitest";
import {
  countWordsInTiptapJSON,
  extractTextFromContent,
  extractTextFromTiptapJSON,
} from "../editor";

describe("editor mention serialization", () => {
  it("preserves mention labels in extracted text", () => {
    const content = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Met " },
            { type: "mention", attrs: { id: "codex-1", label: "Kola" } },
            { type: "text", text: " at dawn." },
          ],
        },
      ],
    };

    expect(extractTextFromTiptapJSON(content)).toBe("Met Kola at dawn.");
  });

  it("falls back to mention id when label is unavailable", () => {
    const content = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "mention", attrs: { id: "codex-legacy" } }],
        },
      ],
    };

    expect(extractTextFromTiptapJSON(content)).toBe("codex-legacy");
  });

  it("preserves explicit @ when user includes it in label", () => {
    const content = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "mention", attrs: { label: "@Kola" } }],
        },
      ],
    };

    expect(extractTextFromTiptapJSON(content)).toBe("@Kola");
  });

  it("counts mention text as words", () => {
    const content = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Asked " },
            { type: "mention", attrs: { label: "Kola" } },
            { type: "text", text: " for help" },
          ],
        },
      ],
    };

    expect(countWordsInTiptapJSON(content)).toBe(4);
  });

  it("extracts mention text from standalone node helper", () => {
    expect(
      extractTextFromContent({
        type: "mention",
        attrs: { id: "codex-1", label: "Kola" },
      }),
    ).toBe("Kola");
  });
});
