import { beforeEach, describe, expect, it, vi } from "vitest";
import { googleAuthService } from "../google-auth-service";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/core/tauri/commands", () => ({
  isTauri: vi.fn(() => false),
}));

vi.mock("@/lib/config/constants", () => ({
  GOOGLE_CONFIG: {
    CLIENT_ID: "test-client-id",
    CLIENT_SECRET: "test-client-secret",
    REDIRECT_URI: "http://localhost:3000/auth/callback",
    SCOPES: ["https://www.googleapis.com/auth/drive.file"],
    AUTH_ENDPOINT: "https://accounts.google.com/o/oauth2/v2/auth",
    TOKEN_ENDPOINT: "https://oauth2.googleapis.com/token",
    REVOKE_ENDPOINT: "https://oauth2.googleapis.com/revoke",
  },
}));

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/core/tauri/commands";

describe("GoogleAuthService Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports required methods", () => {
    expect(googleAuthService).toBeDefined();
    expect(typeof googleAuthService.signIn).toBe("function");
    expect(typeof googleAuthService.signOut).toBe("function");
    expect(typeof googleAuthService.isAuthenticated).toBe("function");
    expect(typeof googleAuthService.getAccessToken).toBe("function");
    expect(typeof googleAuthService.getUserInfo).toBe("function");
  });

  it("rejects sign-in outside desktop runtime", async () => {
    vi.mocked(isTauri).mockReturnValue(false);

    await expect(googleAuthService.signIn()).rejects.toThrow(/desktop app/i);
  });

  it("signs in on desktop runtime", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User Name",
      picture: "https://example.com/p.png",
    });

    await googleAuthService.signIn();

    expect(invoke).toHaveBeenCalledWith("google_oauth_connect", {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
  });

  it("isAuthenticated returns true when desktop token exists", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue("access-token");

    await expect(googleAuthService.isAuthenticated()).resolves.toBe(true);
  });

  it("getUserInfo returns null outside desktop runtime", async () => {
    vi.mocked(isTauri).mockReturnValue(false);

    await expect(googleAuthService.getUserInfo()).resolves.toBeNull();
  });

  it("signOut revokes desktop auth state", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue(undefined);

    await googleAuthService.signOut();

    expect(invoke).toHaveBeenCalledWith("google_oauth_sign_out");
  });
});
