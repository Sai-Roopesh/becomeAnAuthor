/**
 * Check if running in Tauri (desktop app) or browser.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;

  const tauriWindow = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  return "__TAURI__" in tauriWindow || "__TAURI_INTERNALS__" in tauriWindow;
}
