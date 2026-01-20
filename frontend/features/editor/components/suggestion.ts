import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList, MentionListRef } from './mention-list';
import type { ICodexRepository } from '@/domain/repositories/ICodexRepository';
import type { Editor } from '@tiptap/core';

// Type for Tiptap suggestion callback props
interface SuggestionProps {
    editor: Editor;
    clientRect?: (() => DOMRect | null) | null;
    items: Array<{ id: string; name: string; category: string }>;
    command: (item: { id: string; label: string }) => void;
    event?: KeyboardEvent;
}

// Type for onKeyDown specifically (Tiptap only passes event)
interface SuggestionKeyDownProps {
    event: KeyboardEvent;
}


/**
 * Creates a Tiptap suggestion configuration for codex mentions
 * Factory function to allow dependency injection of seriesId and repository
 * Series-first: uses seriesId for codex lookups
 */
export const createCodexSuggestion = (seriesId: string, codexRepo: ICodexRepository) => ({
    items: async ({ query }: { query: string }) => {
        const entries = await codexRepo.getBySeries(seriesId);

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
        let component: ReactRenderer<MentionListRef>;
        let popup: TippyInstance[];

        return {
            onStart: (props: SuggestionProps) => {
                component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) {
                    return;
                }

                popup = tippy('body', {
                    getReferenceClientRect: () => {
                        const rect = props.clientRect?.();
                        return rect || new DOMRect(0, 0, 0, 0);
                    },
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                    // Enable flip to reposition when near screen edges
                    popperOptions: {
                        modifiers: [
                            {
                                name: 'flip',
                                options: {
                                    fallbackPlacements: ['top-start', 'top', 'bottom'],
                                },
                            },
                            {
                                name: 'preventOverflow',
                                options: {
                                    boundary: 'viewport',
                                    padding: 8,
                                },
                            },
                        ],
                    },
                });
            },

            onUpdate(props: SuggestionProps) {
                component.updateProps(props);

                if (!props.clientRect) {
                    return;
                }

                popup?.[0]?.setProps({
                    getReferenceClientRect: () => {
                        const rect = props.clientRect?.();
                        return rect || new DOMRect(0, 0, 0, 0);
                    },
                });
            },

            onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === 'Escape') {
                    popup?.[0]?.hide();
                    return true;
                }

                return component.ref?.onKeyDown({ event: props.event }) ?? false;
            },

            onExit() {
                popup?.[0]?.destroy();
                component.destroy();
            },
        };
    },
});
