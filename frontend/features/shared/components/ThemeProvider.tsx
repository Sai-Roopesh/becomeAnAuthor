"use client";

import * as React from "react";
import {
  APP_PREF_KEYS,
  getAppPreference,
  setAppPreference,
} from "@/core/state/app-state";

export type ThemeMode = "light" | "dark" | "system";

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = React.useState<ThemeMode>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
    resolveTheme(defaultTheme),
  );

  React.useEffect(() => {
    let cancelled = false;

    const loadThemePreference = async () => {
      const persisted = await getAppPreference<ThemeMode>(
        APP_PREF_KEYS.THEME,
        defaultTheme,
      );
      if (cancelled) return;
      const normalized: ThemeMode =
        persisted === "dark" || persisted === "light" || persisted === "system"
          ? persisted
          : defaultTheme;
      setThemeState(normalized);
      setResolvedTheme(resolveTheme(normalized));
    };

    void loadThemePreference();
    return () => {
      cancelled = true;
    };
  }, [defaultTheme]);

  React.useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, [theme]);

  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => {
      const resolved = mediaQuery.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };

    mediaQuery.addEventListener("change", updateTheme);
    return () => {
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, [theme]);

  const setTheme = React.useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    void setAppPreference(APP_PREF_KEYS.THEME, nextTheme);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
