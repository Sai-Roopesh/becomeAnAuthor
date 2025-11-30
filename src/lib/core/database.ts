import Dexie, { Table } from 'dexie';
import type { Project, DocumentNode, Scene, CodexEntry, Series, Snippet, CodexRelation, CodexAddition, Section, ChatThread, ChatMessage, StoryAnalysis } from '@/lib/config/types';

export class NovelDB extends Dexie {
    projects!: Table<Project>;
    nodes!: Table<DocumentNode | Scene>;
    codex!: Table<CodexEntry>;
    series!: Table<Series>;
    snippets!: Table<Snippet>;
    codexRelations!: Table<CodexRelation>;
    codexAdditions!: Table<CodexAddition>;
    sections!: Table<Section>;
    chatThreads!: Table<ChatThread>;
    chatMessages!: Table<ChatMessage>;
    storyAnalyses!: Table<StoryAnalysis>;

    constructor() {
        super('NovelDB');
        this.version(6).stores({
            projects: 'id, title, createdAt, archived, seriesId',
            nodes: 'id, projectId, parentId, type, order',
            codex: 'id, projectId, name, category, *tags',
            series: 'id, title',
            snippets: 'id, projectId, title, pinned',
            codexRelations: 'id, parentId, childId',
            codexAdditions: 'id, sceneId, codexEntryId',
            sections: 'id, sceneId',
            chatThreads: 'id, projectId, pinned, archived, createdAt',
            chatMessages: 'id, threadId, timestamp',
            storyAnalyses: 'id, projectId, analysisType, scope, createdAt, manuscriptVersion',
        });
    }
}

export const db = new NovelDB();
