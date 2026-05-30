"use client";

import { useEffect, useState } from "react";
import { PenTool } from "lucide-react";
import { isTauri } from "@/core/tauri/commands";

interface TauriGuardProps {
  children: React.ReactNode;
}

/**
 * Guards the app so it only renders in the Tauri desktop context.
 *
 * - SSR / first render (null state): renders children transparently to avoid
 *   hydration mismatches — Tauri globals are only available client-side.
 * - Client, not Tauri (browser): renders a "use the desktop app" message.
 * - Client, Tauri confirmed: renders children normally.
 */
export function TauriGuard({ children }: TauriGuardProps) {
  // null = unknown (SSR / before effect runs), true/false = resolved
  const [isTauriEnv, setIsTauriEnv] = useState<boolean | null>(null);

  useEffect(() => {
    setIsTauriEnv(isTauri());
  }, []);

  // SSR or first client render — pass through to avoid hydration mismatch
  if (isTauriEnv === null) {
    return <>{children}</>;
  }

  if (!isTauriEnv) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Become An Author</h1>
              <p className="text-sm text-muted-foreground">
                Desktop app required
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Become An Author requires the desktop app. Please launch the app
            normally.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
