import { describe, it, expect, vi, beforeEach } from "vitest";
import { googleAuthService } from "../google-auth-service";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/core/tauri/commands", () => ({
  isTauri: vi.fn(() => false),
}));

vi.mock("@/core/storage/safe-storage", () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@/lib/config/constants", () => ({
  GOOGLE_CONFIG: {
    CLIENT_ID: "test-client-id",
    REDIRECT_URI: "http://localhost:3000/auth/callback",
    SCOPES: ["https://www.googleapis.com/auth/drive.file"],
    AUTH_ENDPOINT: "https://accounts.google.com/o/oauth2/v2/auth",
    TOKEN_ENDPOINT: "https://oauth2.googleapis.com/token",
    REVOKE_ENDPOINT: "https://oauth2.googleapis.com/revoke",
  },
  STORAGE_KEYS: {
    GOOGLE_TOKENS: "google_oauth_tokens",
    GOOGLE_USER: "google_user_info",
    GOOGLE_PKCE_VERIFIER: "google_pkce_verifier",
  },
  INFRASTRUCTURE: {
    TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000,
  },
}));

import { storage } from "@/core/storage/safe-storage";
import { STORAGE_KEYS } from "@/lib/config/constants";

describe("GoogleAuthService Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("exports required methods", () => {
    expect(googleAuthService).toBeDefined();
    expect(typeof googleAuthService.signIn).toBe("function");
    expect(typeof googleAuthService.signOut).toBe("function");
    expect(typeof googleAuthService.handleCallback).toBe("function");
    expect(typeof googleAuthService.isAuthenticated).toBe("function");
    expect(typeof googleAuthService.getAccessToken).toBe("function");
    expect(typeof googleAuthService.getUserInfo).toBe("function");
  });

  it("isAuthenticated returns true when a valid token exists", async () => {
    vi.mocked(storage.getItem).mockReturnValue({
      accessToken: "valid-token",
      expiresAt: Date.now() + 10 * 60 * 1000,
      scope: "drive.file",
    });

    await expect(googleAuthService.isAuthenticated()).resolves.toBe(true);
  });

  it("isAuthenticated returns false when no token exists", async () => {
    vi.mocked(storage.getItem).mockReturnValue(null);

    await expect(googleAuthService.isAuthenticated()).resolves.toBe(false);
  });

  it("getUserInfo returns stored user", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      name: "Test",
      picture: "https://example.com/p.png",
    };

    vi.mocked(storage.getItem).mockImplementation((key) => {
      if (key === STORAGE_KEYS.GOOGLE_USER) return mockUser;
      return null;
    });

    await expect(googleAuthService.getUserInfo()).resolves.toEqual(mockUser);
  });

  it("getAccessToken returns null when no token exists", async () => {
    vi.mocked(storage.getItem).mockReturnValue(null);
    await expect(googleAuthService.getAccessToken()).resolves.toBeNull();
  });

  it("signOut clears stored auth data", async () => {
    vi.mocked(storage.getItem).mockReturnValue({ accessToken: "token" });
    vi.mocked(global.fetch as unknown as typeof fetch).mockResolvedValue({
      ok: true,
    } as Response);

    await googleAuthService.signOut();

    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.GOOGLE_TOKENS);
    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.GOOGLE_USER);
    expect(storage.removeItem).toHaveBeenCalledWith(
      STORAGE_KEYS.GOOGLE_PKCE_VERIFIER,
    );
  });
});
