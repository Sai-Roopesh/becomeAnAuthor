import { Extension, Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * TypewriterExtension
 * 
 * A TipTap extension that keeps the cursor vertically centered while typing.
 * Inspired by iA Writer's typewriter mode - prevents the cursor from drifting
 * to the bottom of the screen during long writing sessions.
 */

export interface TypewriterOptions {
    /**
     * Vertical position of cursor as percentage from top (20-60)
     * Default: 40 (40% from top)
     */
    offsetPercent: number;

    /**
     * Use smooth scrolling animation
     * Default: true
     */
    smoothScroll: boolean;

    /**
     * Minimum pixels cursor must be off-center before scrolling
     * Default: 20
     */
    scrollThreshold: number;

    /**
     * Whether typewriter mode is enabled
     * Default: false
     */
    enabled: boolean;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        typewriter: {
            /**
             * Toggle typewriter mode on/off
             */
            toggleTypewriter: () => ReturnType;
            /**
             * Set typewriter mode enabled state
             */
            setTypewriterEnabled: (enabled: boolean) => ReturnType;
            /**
             * Set cursor offset percentage
             */
            setTypewriterOffset: (offsetPercent: number) => ReturnType;
        };
    }
}

const pluginKey = new PluginKey('typewriter');

/**
 * Find the nearest scrollable ancestor container
 */
function findScrollContainer(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element.parentElement;

    while (current) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;

        if (overflowY === 'auto' || overflowY === 'scroll') {
            return current;
        }

        current = current.parentElement;
    }

    return null;
}

/**
 * Scroll the editor container to keep cursor at the configured offset
 */
function scrollToCursor(
    editor: Editor,
    options: TypewriterOptions
): void {
    const view = editor.view;
    const dom = view.dom;

    // Find scrollable container (parent with overflow-y: auto/scroll)
    const container = findScrollContainer(dom);
    if (!container) return;

    try {
        const { from } = editor.state.selection;
        const coords = view.coordsAtPos(from);
        const containerRect = container.getBoundingClientRect();

        // Calculate target cursor position based on offset percentage
        const targetY = containerRect.height * (options.offsetPercent / 100);
        const cursorRelativeY = coords.top - containerRect.top;
        const scrollDelta = cursorRelativeY - targetY;

        // Only scroll if beyond threshold
        if (Math.abs(scrollDelta) > options.scrollThreshold) {
            container.scrollBy({
                top: scrollDelta,
                behavior: options.smoothScroll ? 'smooth' : 'auto',
            });
        }
    } catch {
        // Ignore errors from coordsAtPos when selection is invalid
    }
}

export const TypewriterExtension = Extension.create<TypewriterOptions>({
    name: 'typewriter',

    addOptions() {
        return {
            offsetPercent: 40,
            smoothScroll: true,
            scrollThreshold: 20,
            enabled: false,
        };
    },

    addCommands() {
        return {
            toggleTypewriter: () => ({ editor }) => {
                const ext = editor.extensionManager.extensions.find(
                    e => e.name === 'typewriter'
                );
                if (ext) {
                    ext.options.enabled = !ext.options.enabled;
                    if (ext.options.enabled) {
                        scrollToCursor(editor, ext.options);
                    }
                }
                return true;
            },

            setTypewriterEnabled: (enabled: boolean) => ({ editor }) => {
                const ext = editor.extensionManager.extensions.find(
                    e => e.name === 'typewriter'
                );
                if (ext) {
                    ext.options.enabled = enabled;
                    if (enabled) {
                        scrollToCursor(editor, ext.options);
                    }
                }
                return true;
            },

            setTypewriterOffset: (offsetPercent: number) => ({ editor }) => {
                const ext = editor.extensionManager.extensions.find(
                    e => e.name === 'typewriter'
                );
                if (ext) {
                    ext.options.offsetPercent = Math.max(20, Math.min(60, offsetPercent));
                    if (ext.options.enabled) {
                        scrollToCursor(editor, ext.options);
                    }
                }
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        const extensionOptions = this.options;

        return [
            new Plugin({
                key: pluginKey,

                view: () => ({
                    update: (view, prevState) => {
                        // Use closure options (they get updated by commands)
                        if (!extensionOptions.enabled) return;

                        // Only scroll if selection changed (typing or cursor movement)
                        const selectionChanged = !prevState.selection.eq(view.state.selection);
                        if (!selectionChanged) return;

                        // Find editor from extensionManager
                        const editor = this.editor;
                        if (editor) {
                            scrollToCursor(editor, extensionOptions);
                        }
                    },
                }),
            }),
        ];
    },
});

export default TypewriterExtension;
