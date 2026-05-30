// Stub for @tauri-apps/plugin-log used when the Tauri plugin is not available.
// The real plugin is resolved at runtime inside the Tauri webview.
export const debug = (_msg: string) => Promise.resolve();
export const info = (_msg: string) => Promise.resolve();
export const warn = (_msg: string) => Promise.resolve();
export const error = (_msg: string) => Promise.resolve();
