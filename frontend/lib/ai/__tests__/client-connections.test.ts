import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIConnection } from "@/lib/config/ai-vendors";

const mockGetItem = vi.fn();
const mockGetAPIKey = vi.fn();

vi.mock("@/core/storage/safe-storage", () => ({
  storage: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
  },
}));

vi.mock("@/core/storage/api-keys", () => ({
  getAPIKey: (...args: unknown[]) => mockGetAPIKey(...args),
}));

describe("ai/client connection usability", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetItem.mockReset();
    mockGetAPIKey.mockReset();
  });

  it("excludes enabled providers that require keys when key metadata is false", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "google-1",
        name: "Google AI Studio",
        provider: "google",
        apiKey: "",
        hasApiKey: false,
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
      } satisfies AIConnection,
    ]);

    const { getEnabledConnections } = await import("@/lib/ai/client");

    expect(getEnabledConnections()).toEqual([]);
  });

  it("treats legacy enabled providers with unknown key metadata as unusable", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "google-legacy",
        name: "Google Legacy",
        provider: "google",
        apiKey: "",
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
      } satisfies AIConnection,
    ]);

    const { getEnabledConnections } = await import("@/lib/ai/client");

    expect(getEnabledConnections()).toEqual([]);
  });

  it("detects usable key-required connection from secure storage", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "google-2",
        name: "Google",
        provider: "google",
        apiKey: "",
        hasApiKey: false,
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
      } satisfies AIConnection,
    ]);
    mockGetAPIKey.mockResolvedValue("AIza-valid-key");

    const { hasUsableAIConnection } = await import("@/lib/ai/client");

    await expect(hasUsableAIConnection()).resolves.toBe(true);
  });

  it("returns false when all enabled key-required connections are missing keys", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "google-3",
        name: "Google",
        provider: "google",
        apiKey: "",
        hasApiKey: false,
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
      } satisfies AIConnection,
    ]);
    mockGetAPIKey.mockResolvedValue(null);

    const { hasUsableAIConnection } = await import("@/lib/ai/client");

    await expect(hasUsableAIConnection()).resolves.toBe(false);
  });

  it("returns true for enabled local OpenAI endpoint without key", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "openai-local",
        name: "Local OpenAI",
        provider: "openai",
        apiKey: "",
        hasApiKey: false,
        customEndpoint: "http://localhost:11434/v1",
        enabled: true,
        models: ["gpt-4.1-mini"],
        createdAt: 1,
        updatedAt: 1,
      } satisfies AIConnection,
    ]);

    const { hasUsableAIConnection } = await import("@/lib/ai/client");

    await expect(hasUsableAIConnection()).resolves.toBe(true);
    expect(mockGetAPIKey).not.toHaveBeenCalled();
  });
});
