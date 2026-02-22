/**
 * Platform detection and keyboard shortcut helpers.
 */

export const isMac =
  typeof navigator !== "undefined" ? navigator.platform.includes("Mac") : false;

export const isWindows =
  typeof navigator !== "undefined" ? navigator.platform.includes("Win") : false;

export const modKey = isMac ? "⌘" : "Ctrl";
export const altKey = isMac ? "⌥" : "Alt";

export const shortcuts = {
  continueWriting: { key: "j", display: `${modKey}+J` },
  save: { key: "s", display: `${modKey}+S` },
  search: { key: "k", display: `${modKey}+K` },
  undo: { key: "z", display: `${modKey}+Z` },
  redo: { key: "y", display: `${modKey}+Y` },
} as const;

/**
 * Check if the modifier key (Cmd on Mac, Ctrl on Windows) is pressed.
 */
export function isModKey(event: KeyboardEvent): boolean {
  return isMac ? event.metaKey : event.ctrlKey;
}

/**
 * Format a keyboard shortcut for display based on platform.
 */
export function formatShortcut(
  key: string,
  options: boolean | { useAlt?: boolean; useShift?: boolean } = false,
): string {
  const normalized =
    typeof options === "boolean"
      ? { useAlt: options, useShift: false }
      : options;

  const parts = [modKey];

  if (normalized.useShift) {
    parts.push(isMac ? "⇧" : "Shift");
  }

  if (normalized.useAlt) {
    parts.push(altKey);
  }

  const keyLabel =
    key.length <= 1
      ? key.toUpperCase()
      : key.charAt(0).toUpperCase() + key.slice(1);

  parts.push(keyLabel);

  return parts.join("+");
}
