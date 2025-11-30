import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { SuggestionList } from './suggestion-list';
import { db } from '@/lib/core/database';
import { DexieCodexRepository } from '@/infrastructure/repositories/DexieCodexRepository';

const codexRepo = new DexieCodexRepository(db);

export const SuggestionExtension = Extension.create({
    name: 'mention',

    addOptions() {
        return {
            suggestion: {
                char: '@',
                pluginKey: new PluginKey('mention'),
                command: ({ editor, range, props }: any) => {
                    editor
                        .chain()
                        .focus()
                        .insertContentAt(range, [
                            {
                                type: 'mention',
                                attrs: props,
                            },
                            {
                                type: 'text',
                                text: ' ',
                            },
                        ])
                        .run();
                },
                allow: ({ editor, range }: any) => {
                    return editor.can().insertContentAt(range, { type: 'mention' });
                },
                items: async ({ query }: { query: string }) => {
                    // TODO: This needs access to projectId
                    // Currently using empty string as workaround
                    // Should pass projectId from EditorContainer context
                    const allCodexEntries = await codexRepo.getByProject('');

                    if (!query) {
                        return allCodexEntries.slice(0, 5).map(entry => ({
                            name: entry.name,
                            category: entry.category || 'uncategorized'
                        }));
                    }

                    const matchingEntries = allCodexEntries.filter(entry =>
                        entry.name.toLowerCase().includes(query.toLowerCase())
                    );

                    return matchingEntries.map(entry => ({
                        name: entry.name,
                        category: entry.category || 'uncategorized'
                    }));
                },
                render: () => {
                    let component: any;
                    let popup: any;

                    return {
                        onStart: (props: any) => {
                            component = new ReactRenderer(SuggestionList, {
                                props,
                                editor: props.editor,
                            });
                        },
                        onUpdate: (props: any) => {
                            component.updateProps(props);
                        },
                        onKeyDown: (props: any) => {
                            return component.ref?.onKeyDown(props);
                        },
                        onExit: () => {
                            if (component) {
                                component.destroy();
                            }
                        },
                    };
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});
