import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContextAssembly } from "./use-context-assembly";

vi.mock("@/infrastructure/di/AppContext", () => ({
  useAppServices: () => ({
    nodeRepository: {
      getByProject: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      getChildren: vi.fn().mockResolvedValue([]),
    },
    codexRepository: {
      get: vi.fn().mockResolvedValue(null),
    },
    projectRepository: {
      get: vi.fn().mockResolvedValue({ seriesId: "series-123" }),
    },
  }),
}));

describe("useContextAssembly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns assembleContextPack function", () => {
    const { result } = renderHook(() => useContextAssembly("project-123"));

    expect(result.current.assembleContextPack).toBeDefined();
    expect(typeof result.current.assembleContextPack).toBe("function");
  });

  it("returns an empty context pack for empty selection", async () => {
    const { result } = renderHook(() => useContextAssembly("project-123"));

    let pack: Awaited<ReturnType<typeof result.current.assembleContextPack>>;
    await act(async () => {
      pack = await result.current.assembleContextPack([], {
        query: "test query",
        model: "openai/gpt-4.1-mini",
      });
    });

    expect(pack.blocks).toEqual([]);
    expect(pack.serialized).toBe("");
    expect(pack.totalTokens).toBe(0);
  });
});
