"use client";

/**
 * Google OAuth 2.0 Service
 * Desktop-only (Tauri): system-browser loopback OAuth via backend commands.
 */

import { invoke } from "@tauri-apps/api/core";
import { GOOGLE_CONFIG, STORAGE_KEYS } from "@/lib/config/constants";
import { GoogleUser } from "@/domain/entities/types";
import { storage } from "@/core/storage/safe-storage";
import { logger } from "@/shared/utils/logger";
import { isTauri } from "@/core/tauri/commands";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("GoogleAuthService");
const GOOGLE_AUTH_STATE_EVENT = "google-auth-state-updated";

function getConfiguredClientSecret(): string | null {
  const value = GOOGLE_CONFIG.CLIENT_SECRET.trim();
  return value.length > 0 ? value : null;
}

function assertDesktopOAuth(): void {
  if (!isTauri()) {
    throw new Error(
      "Google Drive authentication is available only in the desktop app.",
    );
  }
}

function notifyAuthStateChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GOOGLE_AUTH_STATE_EVENT));
}

class GoogleAuthService {
  subscribeAuthStateChange(listener: () => void): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }
    window.addEventListener(GOOGLE_AUTH_STATE_EVENT, listener);
    return () => {
      window.removeEventListener(GOOGLE_AUTH_STATE_EVENT, listener);
    };
  }

  async signIn(): Promise<void> {
    if (!GOOGLE_CONFIG.CLIENT_ID) {
      throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
    }
    assertDesktopOAuth();

    try {
      const user = await invoke<GoogleUser>("google_oauth_connect", {
        clientId: GOOGLE_CONFIG.CLIENT_ID,
        clientSecret: getConfiguredClientSecret(),
        scopes: GOOGLE_CONFIG.SCOPES,
      });
      storage.setItem(STORAGE_KEYS.GOOGLE_USER, user);
      notifyAuthStateChanged();
    } catch (error) {
      log.error("OAuth sign-in error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to connect Google Drive";
      throw new Error(message);
    }
  }

  async signOut(): Promise<void> {
    try {
      if (isTauri()) {
        await invoke("google_oauth_sign_out");
      }
    } catch (error) {
      log.error("Sign-out error:", error);
    } finally {
      storage.removeItem(STORAGE_KEYS.GOOGLE_TOKENS);
      storage.removeItem(STORAGE_KEYS.GOOGLE_USER);
      storage.removeItem(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER);
      notifyAuthStateChanged();
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!isTauri()) {
      return null;
    }
    try {
      return await invoke<string | null>("google_oauth_get_access_token", {
        clientId: GOOGLE_CONFIG.CLIENT_ID,
        clientSecret: getConfiguredClientSecret(),
      });
    } catch (error) {
      const appError = toAppError(
        error,
        "E_GOOGLE_OAUTH_TOKEN_FAILED",
        "Failed to get desktop OAuth token",
      );
      log.error("Failed to get desktop OAuth token", appError);
      throw appError;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return Boolean(token);
  }

  async getUserInfo(): Promise<GoogleUser | null> {
    if (!isTauri()) {
      return null;
    }
    try {
      const user = await invoke<GoogleUser | null>("google_oauth_get_user");
      if (user) {
        storage.setItem(STORAGE_KEYS.GOOGLE_USER, user);
      }
      return user;
    } catch (error) {
      const appError = toAppError(
        error,
        "E_GOOGLE_OAUTH_USER_FAILED",
        "Failed to load Google account from desktop OAuth",
      );
      log.error("Failed to get desktop Google user", appError);
      throw appError;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
