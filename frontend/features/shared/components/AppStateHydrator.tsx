"use client";

import { useEffect, useState } from "react";
import {
  APP_PREF_KEYS,
  getAppPreference,
  setAppPreference,
} from "@/core/state/app-state";
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
        log.error("Failed to hydrate app state from SQLite:", error);
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
    return null;
  }

  return <>{children}</>;
}
