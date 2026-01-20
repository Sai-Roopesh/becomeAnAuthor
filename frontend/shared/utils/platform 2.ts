/**
 * Platform detection and keyboard shortcut helpers.
 */

export const isMac = typeof navigator !== 'undefined'
    ? navigator.platform.includes('Mac')
    : false;

export const isWindows = typeof navigator !== 'undefined'
    ? navigator.platform.includes('Win')
    : false;

export const modKey = isMac ? '⌘' : 'Ctrl';
export const altKey = isMac ? '⌥' : 'Alt';

export const shortcuts = {
    continueWriting: { key: 'j', display: `${modKey}+J` },
    save: { key: 's', display: `${modKey}+S` },
    search: { key: 'k', display: `${modKey}+K` },
    undo: { key: 'z', display: `${modKey}+Z` },
    redo: { key: 'y', display: `${modKey}+Y` },
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
export function formatShortcut(key: string, useAlt = false): string {
    const mod = useAlt ? altKey : modKey;
    return `${mod}+${key.toUpperCase()}`;
}
