import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAI } from "./use-ai";
import { stream } from "@/lib/ai";

vi.mock("@/core/storage/safe-storage", () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock("@/lib/ai", () => ({
  generate: vi.fn(),
  stream: vi.fn(),
}));

vi.mock("@/shared/utils/toast-service", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useAI", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { storage } = await import("@/core/storage/safe-storage");
    vi.mocked(storage.getItem).mockReturnValue("");
  });

  it("initializes with no model when storage is empty", () => {
    const { result } = renderHook(() => useAI());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.model).toBe("");
  });

  it("allows setting model explicitly", () => {
    const { result } = renderHook(() => useAI());

    act(() => {
      result.current.setModel("openai/gpt-4.1-mini");
    });

    expect(result.current.model).toBe("openai/gpt-4.1-mini");
  });

  it("prepends default system message when streaming", async () => {
    const streamResult = {
      textStream: (async function* () {
        yield "hello";
      })(),
    } as unknown as Awaited<ReturnType<typeof stream>>;
    vi.mocked(stream).mockResolvedValue(streamResult);

    const { result } = renderHook(() =>
      useAI({ defaultSystem: "System guardrail" }),
    );

    act(() => {
      result.current.setModel("openai/gpt-4.1-mini");
    });

    let text = "";
    await act(async () => {
      text = await result.current.generateStream({
        messages: [{ role: "user", content: "Write one line." }],
      });
    });

    expect(text).toBe("hello");
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-4.1-mini",
        messages: [
          { role: "system", content: "System guardrail" },
          { role: "user", content: "Write one line." },
        ],
      }),
    );
  });
});
