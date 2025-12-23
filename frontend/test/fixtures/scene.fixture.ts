/**
 * Scene Fixtures
 * 
 * Sample scene data for testing
 */

import type { Scene } from '@/domain/entities/types';

export const createMockScene = (overrides: Partial<Scene> = {}): Scene => ({
    id: 'scene-1',
    projectId: 'project-1',
    parentId: 'chapter-1',
    type: 'scene',
    title: 'Test Scene',
    order: 0,
    expanded: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: {
        type: 'doc',
        content: [
            {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Test content' }]
            }
        ]
    },
    summary: '',
    status: 'draft',
    wordCount: 2,
    ...overrides,
});

export const mockSceneWithContent = createMockScene({
    id: 'scene-with-content',
    title: 'Scene with Rich Content',
    content: {
        type: 'doc',
        content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter 1' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'The story begins here.' }] },
            {
                type: 'paragraph', content: [
                    { type: 'text', text: 'Sarah looked at the ' },
                    { type: 'text', marks: [{ type: 'bold' }], text: 'mysterious letter' },
                    { type: 'text', text: '.' }
                ]
            },
        ]
    },
    wordCount: 12,
});

export const mockEmptyScene = createMockScene({
    id: 'empty-scene',
    title: 'Empty Scene',
    content: { type: 'doc', content: [] },
    wordCount: 0,
});
