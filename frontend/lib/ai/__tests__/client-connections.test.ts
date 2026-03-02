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

  it("returns enabled connections for runtime secure-key checks", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "google-1",
        name: "Google AI Studio",
        provider: "google",
        apiKey: "",
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
      } satisfies AIConnection,
    ]);

    const { getEnabledConnections } = await import("@/lib/ai/client");

    expect(getEnabledConnections()).toHaveLength(1);
  });

  it("keeps enabled providers available for runtime key resolution", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "google-enabled",
        name: "Google Enabled",
        provider: "google",
        apiKey: "",
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
      } satisfies AIConnection,
    ]);

    const { getEnabledConnections } = await import("@/lib/ai/client");

    expect(getEnabledConnections()).toHaveLength(1);
  });

  it("detects usable key-required connection from secure storage", async () => {
    mockGetItem.mockReturnValue([
      {
        id: "google-2",
        name: "Google",
        provider: "google",
        apiKey: "",
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
