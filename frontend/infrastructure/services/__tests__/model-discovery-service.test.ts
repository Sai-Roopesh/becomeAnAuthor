import { beforeEach, describe, expect, it, vi } from "vitest";
import { modelDiscoveryService } from "../ModelDiscoveryService";

vi.mock("@/core/storage/safe-storage", () => ({
  storage: {
    getItem: <T>(key: string, fallback: T): T => {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    setItem: (key: string, value: unknown) => {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
    },
  },
}));

describe("ModelDiscoveryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    modelDiscoveryService.clearCache();
  });

  it("normalizes OpenAI-compatible custom endpoints to /models", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "local-llama" }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await modelDiscoveryService.fetchModels(
      "openai",
      "",
      "http://localhost:11434/v1",
    );

    expect(result.error).toBeUndefined();
    expect(result.models.map((model) => model.id)).toEqual(["local-llama"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/models",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns an error instead of stale defaults when dynamic listing fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid API key" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await modelDiscoveryService.fetchModels(
      "google",
      "AIza-invalid",
    );

    expect(result.models).toEqual([]);
    expect(result.error).toContain("Failed to fetch models");
    expect(result.error).toContain("Invalid API key");
  });

  it("requires manual model IDs for providers without listing endpoints", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await modelDiscoveryService.fetchModels("cohere", "test");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.models).toEqual([]);
    expect(result.error).toContain("Enter model IDs manually");
  });
});
