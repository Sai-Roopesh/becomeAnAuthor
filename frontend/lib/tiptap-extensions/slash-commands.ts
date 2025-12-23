import { Extension, Editor, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { SlashCommandsList } from './slash-commands-list';

/** Context passed to slash command handlers */
interface SlashCommandContext {
    editor: Editor;
    range: Range;
    props?: { command: (ctx: SlashCommandContext) => void };
}

export const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                startOfLine: false,
                command: ({ editor, range, props }: SlashCommandContext) => {
                    props?.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [];
    },
});

export function getSuggestionItems() {
    return [
        {
            title: 'Scene Beat',
            description: 'A pivotal moment where something important changes',
            icon: '⚡',
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).run();
                // Trigger scene beat dialog
                const event = new CustomEvent('openSceneBeat');
                window.dispatchEvent(event);
            },
        },
        {
            title: 'Continue Writing',
            description: 'Creates a new scene beat to continue writing',
            icon: '✍️',
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).run();
                // Trigger AI generation
                const event = new CustomEvent('continueWriting');
                window.dispatchEvent(event);
            },
        },
        {
            title: 'Section',
            description: 'Create a colored section block',
            icon: '📦',
            command: ({ editor, range }: SlashCommandContext) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .insertContent({
                        type: 'section',
                        content: [{ type: 'paragraph' }],
                    })
                    .run();
            },
        },
        {
            title: 'Horizontal Rule',
            description: 'Insert a scene divider',
            icon: '─',
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
        },
    ];
}
