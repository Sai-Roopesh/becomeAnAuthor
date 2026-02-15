"use client";

import { Loader2, PenTool } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
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
