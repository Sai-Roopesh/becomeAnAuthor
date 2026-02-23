/**
 * React hook for Google OAuth authentication
 * Manages authentication state and provides auth methods
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { googleAuthService } from "@/infrastructure/services/google-auth-service";
import { GoogleUser } from "@/domain/entities/types";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("GoogleAuth");

export function useGoogleAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const authenticated = await googleAuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const userInfo = await googleAuthService.getUserInfo();
        setUser(userInfo);
      } else {
        setUser(null);
      }
    } catch (error) {
      log.error("Failed to refresh auth state:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshAuth(true);
    const unsubscribe = googleAuthService.subscribeAuthStateChange(() => {
      void refreshAuth(false);
    });
    return unsubscribe;
  }, [refreshAuth]);

  const signIn = async () => {
    try {
      await googleAuthService.signIn();
      await refreshAuth(false);
    } catch (error) {
      log.error("Sign-in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await googleAuthService.signOut();
      await refreshAuth(false);
    } catch (error) {
      log.error("Sign-out error:", error);
      throw error;
    }
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    signIn,
    signOut,
    refreshAuth: () => refreshAuth(false),
  };
}
