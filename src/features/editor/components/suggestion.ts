import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { MentionList } from './mention-list';
import { db } from '@/lib/core/database';
import { DexieCodexRepository } from '@/infrastructure/repositories/DexieCodexRepository';

const codexRepo = new DexieCodexRepository(db);

export const suggestion = {
    items: async ({ query }: { query: string }) => {
        // TODO: This needs access to projectId
        // Currently using empty string as workaround
        // Should pass projectId from EditorContainer context
        const entries = await codexRepo.getByProject('');

        if (!query) {
            return entries
                .slice(0, 5)
                .map(item => ({ id: item.id, name: item.name, category: item.category || 'uncategorized' }));
        }

        return entries
            .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10)
            .map(item => ({ id: item.id, name: item.name, category: item.category || 'uncategorized' }));
    },

    render: () => {
        let component: ReactRenderer;
        let popup: any;

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) {
                    return;
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate(props: any) {
                component.updateProps(props);

                if (!props.clientRect) {
                    return;
                }

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }

                return (component.ref as any)?.onKeyDown(props);
            },

            onExit() {
                popup[0].destroy();
                component.destroy();
            },
        };
    },
};
