"use client";

/**
 * Google OAuth 2.0 Service
 * - Desktop (Tauri): system-browser loopback OAuth via backend command + keychain token storage
 * - Web fallback: PKCE SPA flow with localStorage session
 */

import { invoke } from "@tauri-apps/api/core";
import {
  GOOGLE_CONFIG,
  STORAGE_KEYS,
  INFRASTRUCTURE,
} from "@/lib/config/constants";
import { GoogleTokens, GoogleUser } from "@/domain/entities/types";
import { storage } from "@/core/storage/safe-storage";
import { logger } from "@/shared/utils/logger";
import { isTauri } from "@/core/tauri/commands";

const log = logger.scope("GoogleAuthService");

function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join("");
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);

  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

class GoogleAuthService {
  async signIn(): Promise<void> {
    if (!GOOGLE_CONFIG.CLIENT_ID) {
      throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
    }

    // Desktop flow: backend command opens browser and handles callback securely.
    if (isTauri()) {
      const user = await invoke<GoogleUser>("google_oauth_connect", {
        clientId: GOOGLE_CONFIG.CLIENT_ID,
        scopes: GOOGLE_CONFIG.SCOPES,
      });
      storage.setItem(STORAGE_KEYS.GOOGLE_USER, user);
      return;
    }

    // Web fallback flow (PKCE SPA)
    try {
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await sha256(codeVerifier);

      storage.setItem(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER, codeVerifier);

      const params = new URLSearchParams({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
        response_type: "code",
        scope: GOOGLE_CONFIG.SCOPES.join(" "),
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        access_type: "offline",
        prompt: "consent",
      });

      window.location.href = `${GOOGLE_CONFIG.AUTH_ENDPOINT}?${params}`;
    } catch (error) {
      log.error("OAuth sign-in error:", error);
      throw new Error("Failed to initiate Google sign-in");
    }
  }

  async handleCallback(code: string): Promise<void> {
    if (isTauri()) {
      // Desktop flow does not use frontend callback route.
      return;
    }

    try {
      const codeVerifier = storage.getItem<string>(
        STORAGE_KEYS.GOOGLE_PKCE_VERIFIER,
        "",
      );
      if (!codeVerifier) {
        throw new Error("Missing code verifier");
      }

      const response = await fetch(GOOGLE_CONFIG.TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CONFIG.CLIENT_ID,
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || "Token exchange failed");
      }

      const data = await response.json();

      const tokens: GoogleTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope,
      };

      storage.setItem(STORAGE_KEYS.GOOGLE_TOKENS, tokens);
      await this.fetchUserInfo(tokens.accessToken);
      storage.removeItem(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER);
    } catch (error) {
      log.error("OAuth callback error:", error);
      throw new Error("Failed to complete Google sign-in");
    }
  }

  private async fetchUserInfo(accessToken: string): Promise<void> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const data = await response.json();
    const user: GoogleUser = {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };

    storage.setItem(STORAGE_KEYS.GOOGLE_USER, user);
  }

  async signOut(): Promise<void> {
    try {
      if (isTauri()) {
        await invoke("google_oauth_sign_out");
      } else {
        const tokens = storage.getItem<GoogleTokens | null>(
          STORAGE_KEYS.GOOGLE_TOKENS,
          null,
        );

        if (tokens?.accessToken) {
          await fetch(GOOGLE_CONFIG.REVOKE_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              token: tokens.accessToken,
            }),
          });
        }
      }
    } catch (error) {
      log.error("Sign-out error:", error);
    } finally {
      storage.removeItem(STORAGE_KEYS.GOOGLE_TOKENS);
      storage.removeItem(STORAGE_KEYS.GOOGLE_USER);
      storage.removeItem(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER);
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (isTauri()) {
      try {
        return await invoke<string | null>("google_oauth_get_access_token", {
          clientId: GOOGLE_CONFIG.CLIENT_ID,
        });
      } catch (error) {
        log.error("Failed to get desktop OAuth token", error);
        return null;
      }
    }

    const tokens = storage.getItem<GoogleTokens | null>(
      STORAGE_KEYS.GOOGLE_TOKENS,
      null,
    );

    if (!tokens) {
      return null;
    }

    const isExpired =
      tokens.expiresAt < Date.now() + INFRASTRUCTURE.TOKEN_REFRESH_BUFFER_MS;

    if (isExpired && tokens.refreshToken) {
      await this.refreshAccessToken(tokens.refreshToken);

      const newTokens = storage.getItem<GoogleTokens | null>(
        STORAGE_KEYS.GOOGLE_TOKENS,
        null,
      );
      return newTokens?.accessToken || null;
    }

    return tokens.accessToken;
  }

  private async refreshAccessToken(refreshToken: string): Promise<void> {
    try {
      const response = await fetch(GOOGLE_CONFIG.TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CONFIG.CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();

      const newTokens: GoogleTokens = {
        accessToken: data.access_token,
        refreshToken: refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope,
      };

      storage.setItem(STORAGE_KEYS.GOOGLE_TOKENS, newTokens);
    } catch (error) {
      log.error("Token refresh error:", error);
      await this.signOut();
      throw new Error("Session expired. Please sign in again.");
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return Boolean(token);
  }

  async getUserInfo(): Promise<GoogleUser | null> {
    if (isTauri()) {
      try {
        const user = await invoke<GoogleUser | null>("google_oauth_get_user");
        if (user) {
          storage.setItem(STORAGE_KEYS.GOOGLE_USER, user);
        }
        return user;
      } catch (error) {
        log.error("Failed to get desktop Google user", error);
        return null;
      }
    }

    return storage.getItem<GoogleUser | null>(STORAGE_KEYS.GOOGLE_USER, null);
  }
}

export const googleAuthService = new GoogleAuthService();
