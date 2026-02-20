import { describe, expect, it } from "vitest";
import { formatModelIds, parseModelIds } from "../model-ids";

describe("model-ids utils", () => {
  it("parses newline and comma separated model IDs", () => {
    const parsed = parseModelIds(
      "gpt-4.1-mini\nclaude-sonnet-4-20250514,gemini-2.5-pro",
    );

    expect(parsed).toEqual([
      "gpt-4.1-mini",
      "claude-sonnet-4-20250514",
      "gemini-2.5-pro",
    ]);
  });

  it("deduplicates and trims model IDs", () => {
    const parsed = parseModelIds(" gpt-4.1-mini , gpt-4.1-mini \n  ");
    expect(parsed).toEqual(["gpt-4.1-mini"]);
  });

  it("formats model IDs for textarea display", () => {
    expect(formatModelIds(["a", "b"])).toBe("a\nb");
    expect(formatModelIds([])).toBe("");
  });
});
