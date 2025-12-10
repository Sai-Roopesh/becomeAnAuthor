import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SectionComponent } from '@/features/editor';

export interface SectionAttributes {
    title: string;
    color: string;
    excludeFromAI: boolean;
    collapsed: boolean;
}

export const Section = Node.create({
    name: 'section',

    group: 'block',

    content: 'block+',

    defining: true,

    addAttributes() {
        return {
            title: {
                default: 'Untitled Section',
                parseHTML: element => element.getAttribute('data-title'),
                renderHTML: attributes => ({
                    'data-title': attributes['title'],
                }),
            },
            color: {
                default: '#3b82f6',
                parseHTML: element => element.getAttribute('data-color'),
                renderHTML: attributes => ({
                    'data-color': attributes['color'],
                }),
            },
            excludeFromAI: {
                default: false,
                parseHTML: element => element.getAttribute('data-exclude-ai') === 'true',
                renderHTML: attributes => ({
                    'data-exclude-ai': attributes['excludeFromAI'],
                }),
            },
            collapsed: {
                default: false,
                parseHTML: element => element.getAttribute('data-collapsed') === 'true',
                renderHTML: attributes => ({
                    'data-collapsed': attributes['collapsed'],
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="section"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'section' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(SectionComponent);
    },
});
