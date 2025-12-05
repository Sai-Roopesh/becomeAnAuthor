import Dexie, { Table } from 'dexie';
import type {
    Project,
    DocumentNode,
    Scene,
    CodexEntry,
    Series,
    Snippet,
    CodexRelation,
    CodexAddition,
    Section,
    ChatThread,
    ChatMessage,
    StoryAnalysis,
    CodexTag,
    CodexEntryTag,
    CodexTemplate,
    CodexRelationType
} from '@/lib/config/types';

/**
 * Emergency backup stored in IndexedDB (replaces localStorage for safety)
 * Used when normal save fails or on page unload
 */
export interface EmergencyBackup {
    id: string;
    sceneId: string;
    content: any;
    createdAt: number;
    expiresAt: number;
}

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

    // Phase 1 Codex enhancements
    codexTags!: Table<CodexTag>;
    codexEntryTags!: Table<CodexEntryTag>;
    codexTemplates!: Table<CodexTemplate>;
    codexRelationTypes!: Table<CodexRelationType>;

    // NEW: Emergency backup table (replaces localStorage)
    emergencyBackups!: Table<EmergencyBackup>;

    constructor() {
        super('NovelDB');

        // Version 9: Add emergencyBackups table for safe offline backup
        this.version(9).stores({
            projects: 'id, title, createdAt, archived, seriesId',
            nodes: 'id, projectId, parentId, type, order',
            codex: 'id, projectId, name, category, *tags',
            series: 'id, title',
            snippets: 'id, projectId, title, pinned',
            codexRelations: 'id, parentId, childId, type',
            codexAdditions: 'id, sceneId, codexEntryId',
            sections: 'id, sceneId',
            chatThreads: 'id, projectId, pinned, archived, createdAt',
            chatMessages: 'id, threadId, timestamp',
            storyAnalyses: 'id, projectId, analysisType, scope, createdAt, manuscriptVersion',
            codexTags: 'id, projectId, name, category',
            codexEntryTags: 'id, entryId, tagId, [entryId+tagId]',
            codexTemplates: 'id, [name+category], category, isBuiltIn, projectId',
            codexRelationTypes: 'id, [name+category], category, isBuiltIn',
            // NEW: Emergency backup table
            emergencyBackups: 'id, sceneId, expiresAt',
        });

        // Version 8: Add unique constraints to prevent duplicates
        this.version(8).stores({
            projects: 'id, title, createdAt, archived, seriesId',
            nodes: 'id, projectId, parentId, type, order',
            codex: 'id, projectId, name, category, *tags',
            series: 'id, title',
            snippets: 'id, projectId, title, pinned',
            codexRelations: 'id, parentId, childId, type',
            codexAdditions: 'id, sceneId, codexEntryId',
            sections: 'id, sceneId',
            chatThreads: 'id, projectId, pinned, archived, createdAt',
            chatMessages: 'id, threadId, timestamp',
            storyAnalyses: 'id, projectId, analysisType, scope, createdAt, manuscriptVersion',
            // Enhanced with unique compound indexes
            codexTags: 'id, projectId, name, category',
            codexEntryTags: 'id, entryId, tagId, [entryId+tagId]',
            codexTemplates: 'id, [name+category], category, isBuiltIn, projectId',  // ✅ Unique constraint on name+category
            codexRelationTypes: 'id, [name+category], category, isBuiltIn',  // ✅ Unique constraint on name+category
        }).upgrade(async (trans) => {
            // Migration: Clean up duplicates before applying unique constraints
            console.log('🔄 Migrating to database version 8: cleaning up duplicates...');

            // Clean up duplicate templates
            const templates = await trans.table('codexTemplates').toArray();
            const templateSeen = new Map<string, any>();
            const templatesToDelete: string[] = [];

            for (const template of templates) {
                const key = `${template.name}|${template.category}`;
                const existing = templateSeen.get(key);

                if (existing) {
                    // Keep the older one (smaller createdAt)
                    if (template.createdAt < existing.createdAt) {
                        templatesToDelete.push(existing.id);
                        templateSeen.set(key, template);
                    } else {
                        templatesToDelete.push(template.id);
                    }
                } else {
                    templateSeen.set(key, template);
                }
            }

            if (templatesToDelete.length > 0) {
                await trans.table('codexTemplates').bulkDelete(templatesToDelete);
                console.log(`🧹 Removed ${templatesToDelete.length} duplicate templates`);
            }

            // Clean up duplicate relation types
            const relationTypes = await trans.table('codexRelationTypes').toArray();
            const typeSeen = new Map<string, any>();
            const typesToDelete: string[] = [];

            for (const type of relationTypes) {
                const key = `${type.name}|${type.category}`;
                if (typeSeen.has(key)) {
                    typesToDelete.push(type.id);
                } else {
                    typeSeen.set(key, type);
                }
            }

            if (typesToDelete.length > 0) {
                await trans.table('codexRelationTypes').bulkDelete(typesToDelete);
                console.log(`🧹 Removed ${typesToDelete.length} duplicate relation types`);
            }

            console.log('✅ Migration to version 8 complete');
        });

        // Version 7: Add Codex enhancement tables (tags, templates, relation types)
        this.version(7).stores({
            projects: 'id, title, createdAt, archived, seriesId',
            nodes: 'id, projectId, parentId, type, order',
            codex: 'id, projectId, name, category, *tags',
            series: 'id, title',
            snippets: 'id, projectId, title, pinned',
            codexRelations: 'id, parentId, childId, type',
            codexAdditions: 'id, sceneId, codexEntryId',
            sections: 'id, sceneId',
            chatThreads: 'id, projectId, pinned, archived, createdAt',
            chatMessages: 'id, threadId, timestamp',
            storyAnalyses: 'id, projectId, analysisType, scope, createdAt, manuscriptVersion',
            // NEW tables for Phase 1
            codexTags: 'id, projectId, name, category',
            codexEntryTags: 'id, entryId, tagId, [entryId+tagId]',
            codexTemplates: 'id, category, isBuiltIn, projectId',
            codexRelationTypes: 'id, category, isBuiltIn',
        });

        // Keep version 6 for migration compatibility
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
