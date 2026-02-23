/**
 * Legacy Web OAuth callback route.
 * Google Drive auth is desktop-only via Tauri loopback callback.
 */

"use client";

export default function AuthCallbackPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 space-y-3 text-center">
        <h1 className="text-xl font-semibold">
          Google Drive Uses Desktop Auth
        </h1>
        <p className="text-sm text-muted-foreground">
          This callback page is no longer used. Return to the desktop app and
          connect Google Drive from Backup Center.
        </p>
      </div>
    </div>
  );
}
