"use client";

import { useEffect, useState } from "react";
import { Loader2, PenTool } from "lucide-react";
import {
  APP_PREF_KEYS,
  getAppPreference,
  setAppPreference,
} from "@/core/state/app-state";
import { TauriNotAvailableError } from "@/core/tauri/invoke";
import {
  defaultProjectStorePersistenceState,
  normalizeProjectStorePersistenceState,
  selectProjectStorePersistenceState,
  useProjectStore,
  type ProjectStorePersistenceState,
} from "@/store/use-project-store";
import {
  normalizeFormatSettings,
  selectFormatSettings,
  useFormatStore,
  type FormatSettings,
} from "@/store/use-format-store";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("AppStateHydrator");

interface AppStateHydratorProps {
  children: React.ReactNode;
}

export function AppStateHydrator({ children }: AppStateHydratorProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const [projectPref, formatPref, sidebarOpen] = await Promise.all([
          getAppPreference<Partial<ProjectStorePersistenceState>>(
            APP_PREF_KEYS.PROJECT_STORE,
            {},
          ),
          getAppPreference<Partial<FormatSettings>>(
            APP_PREF_KEYS.FORMAT_SETTINGS,
            {},
          ),
          getAppPreference<boolean>(
            APP_PREF_KEYS.SIDEBAR_OPEN,
            defaultProjectStorePersistenceState.showSidebar,
          ),
        ]);

        if (cancelled) return;

        const projectState = normalizeProjectStorePersistenceState(projectPref);
        const formatState = normalizeFormatSettings(formatPref);

        useProjectStore.setState({
          ...projectState,
          showSidebar: sidebarOpen,
        });
        useFormatStore.setState(formatState);

        let lastProjectSerialized = JSON.stringify(
          selectProjectStorePersistenceState(useProjectStore.getState()),
        );
        let lastFormatSerialized = JSON.stringify(
          selectFormatSettings(useFormatStore.getState()),
        );

        const unsubscribeProject = useProjectStore.subscribe((state) => {
          const next = selectProjectStorePersistenceState(state);
          const serialized = JSON.stringify(next);
          if (serialized === lastProjectSerialized) {
            return;
          }
          lastProjectSerialized = serialized;
          void setAppPreference(APP_PREF_KEYS.PROJECT_STORE, next);
          void setAppPreference(APP_PREF_KEYS.SIDEBAR_OPEN, next.showSidebar);
        });

        const unsubscribeFormat = useFormatStore.subscribe((state) => {
          const next = selectFormatSettings(state);
          const serialized = JSON.stringify(next);
          if (serialized === lastFormatSerialized) {
            return;
          }
          lastFormatSerialized = serialized;
          void setAppPreference(APP_PREF_KEYS.FORMAT_SETTINGS, next);
        });

        if (!cancelled) {
          setReady(true);
        }

        return () => {
          unsubscribeProject();
          unsubscribeFormat();
        };
      } catch (error) {
        if (!(error instanceof TauriNotAvailableError)) {
          log.error("Failed to hydrate app state from SQLite:", error);
        }
        if (!cancelled) {
          setReady(true);
        }
        return undefined;
      }
    };

    let cleanup: (() => void) | undefined;
    void initialize().then((dispose) => {
      if (cancelled) {
        dispose?.();
        return;
      }
      cleanup = dispose;
    });

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">
                Starting Become An Author
              </h1>
              <p className="text-sm text-muted-foreground">
                Preparing editor shell...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading workspace
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
