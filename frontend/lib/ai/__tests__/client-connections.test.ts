import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIConnection, AIProvider } from "@/lib/config/ai-vendors";

const mockListAIConnections = vi.fn();
const mockGetAPIKey = vi.fn();

vi.mock("@/core/state/app-state", () => ({
  listAIConnections: (...args: unknown[]) => mockListAIConnections(...args),
  toAIConnection: (connection: {
    id: string;
    name: string;
    provider: string;
    customEndpoint?: string;
    enabled: boolean;
    models?: string[];
    createdAt: number;
    updatedAt: number;
  }): AIConnection => {
    const aiConnection: AIConnection = {
      id: connection.id,
      name: connection.name,
      provider: connection.provider as AIProvider,
      enabled: connection.enabled,
      models: connection.models ?? [],
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      apiKey: "",
    };
    if (connection.customEndpoint) {
      aiConnection.customEndpoint = connection.customEndpoint;
    }
    return aiConnection;
  },
  APP_PREF_KEYS: {
    LAST_USED_MODEL: "ai.last_used_model",
  },
}));

vi.mock("@/core/storage/api-keys", () => ({
  getAPIKey: (...args: unknown[]) => mockGetAPIKey(...args),
}));

describe("ai/client connection usability", () => {
  beforeEach(() => {
    vi.resetModules();
    mockListAIConnections.mockReset();
    mockGetAPIKey.mockReset();
  });

  it("returns enabled connections for runtime secure-key checks", async () => {
    mockListAIConnections.mockResolvedValue([
      {
        id: "google-1",
        name: "Google AI Studio",
        provider: "google",
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
        hasStoredApiKey: true,
      },
    ]);

    const { getEnabledConnections } = await import("@/lib/ai/client");

    await expect(getEnabledConnections()).resolves.toHaveLength(1);
  });

  it("keeps enabled providers available for runtime key resolution", async () => {
    mockListAIConnections.mockResolvedValue([
      {
        id: "google-enabled",
        name: "Google Enabled",
        provider: "google",
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
        hasStoredApiKey: true,
      },
    ]);

    const { getEnabledConnections } = await import("@/lib/ai/client");

    await expect(getEnabledConnections()).resolves.toHaveLength(1);
  });

  it("detects usable key-required connection from secure storage", async () => {
    mockListAIConnections.mockResolvedValue([
      {
        id: "google-2",
        name: "Google",
        provider: "google",
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
        hasStoredApiKey: true,
      },
    ]);
    mockGetAPIKey.mockResolvedValue("AIza-valid-key");

    const { hasUsableAIConnection } = await import("@/lib/ai/client");

    await expect(hasUsableAIConnection()).resolves.toBe(true);
  });

  it("returns false when all enabled key-required connections are missing keys", async () => {
    mockListAIConnections.mockResolvedValue([
      {
        id: "google-3",
        name: "Google",
        provider: "google",
        enabled: true,
        models: ["gemini-2.5-flash"],
        createdAt: 1,
        updatedAt: 1,
        hasStoredApiKey: false,
      },
    ]);
    mockGetAPIKey.mockResolvedValue(null);

    const { hasUsableAIConnection } = await import("@/lib/ai/client");

    await expect(hasUsableAIConnection()).resolves.toBe(false);
  });

  it("returns true for enabled local OpenAI endpoint without key", async () => {
    mockListAIConnections.mockResolvedValue([
      {
        id: "openai-local",
        name: "Local OpenAI",
        provider: "openai",
        customEndpoint: "http://localhost:11434/v1",
        enabled: true,
        models: ["gpt-4.1-mini"],
        createdAt: 1,
        updatedAt: 1,
        hasStoredApiKey: false,
      },
    ]);

    const { hasUsableAIConnection } = await import("@/lib/ai/client");

    await expect(hasUsableAIConnection()).resolves.toBe(true);
    expect(mockGetAPIKey).not.toHaveBeenCalled();
  });
});
