"use client";

import { useEffect, useRef } from "react";
import { isTauri } from "@/core/tauri/commands";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("UpdateNotifier");
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function UpdateNotifier() {
  const promptedForVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let cancelled = false;

    const checkForUpdates = async () => {
      try {
        const [{ check }, { relaunch }] = await Promise.all([
          import("@tauri-apps/plugin-updater"),
          import("@tauri-apps/plugin-process"),
        ]);

        const update = await check();
        if (!update || cancelled) {
          return;
        }

        // Avoid repeatedly prompting for the same update while app is open.
        if (promptedForVersionRef.current === update.version) {
          return;
        }
        promptedForVersionRef.current = update.version;

        toast.info(`Update ${update.version} is available`, {
          description: `Current version: ${update.currentVersion}`,
          action: {
            label: "Update now",
            onClick: async () => {
              const loadingToast = toast.loading("Downloading update...");
              try {
                await update.downloadAndInstall();
                toast.dismiss(loadingToast);
                toast.success("Update installed", {
                  description: "Restart the app to finish applying the update.",
                  action: {
                    label: "Restart",
                    onClick: () => {
                      void relaunch();
                    },
                  },
                });
              } catch (error) {
                log.error("Failed to install update", error);
                toast.dismiss(loadingToast);
                toast.error("Failed to install update");
              }
            },
          },
        });
      } catch (error) {
        // Common during development or when updater config/secrets are not set yet.
        log.warn("Update check skipped", { error });
      }
    };

    void checkForUpdates();
    const timer = window.setInterval(() => {
      void checkForUpdates();
    }, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
