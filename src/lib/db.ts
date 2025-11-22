import Dexie, { Table } from 'dexie';
import { Project, DocumentNode, CodexEntry, Series, Scene, Snippet, CodexRelation } from './types';

export class NovelDB extends Dexie {
    projects!: Table<Project>;
    nodes!: Table<DocumentNode | Scene>;
    codex!: Table<CodexEntry>;
    series!: Table<Series>;
    snippets!: Table<Snippet>;
    codexRelations!: Table<CodexRelation>;

    constructor() {
        super('NovelDB');
        this.version(3).stores({
            projects: 'id, title, createdAt, archived, seriesId',
            nodes: 'id, projectId, parentId, type, order',
            codex: 'id, projectId, name, category, *tags',
            series: 'id, title',
            snippets: 'id, projectId, title, pinned',
            codexRelations: 'id, parentId, childId'
        });
    }
}

export const db = new NovelDB();
