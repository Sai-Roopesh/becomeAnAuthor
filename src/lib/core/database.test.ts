/**
 * Database Migration Tests
 * 
 * These tests verify that database migrations work correctly and don't lose data.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import 'fake-indexeddb/auto';

describe('Database Migrations', () => {
    let testDb: Dexie;

    afterEach(async () => {
        if (testDb) {
            testDb.close();
            await Dexie.delete('TestNovelDB');
        }
    });

    describe('v8 to v9 migration', () => {
        it('should preserve existing data when upgrading', async () => {
            // 1. Create v8 database with sample data
            const v8Db = new Dexie('TestNovelDB');
            v8Db.version(8).stores({
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
            });

            // Add test data
            await v8Db.table('projects').add({
                id: 'test-project-1',
                title: 'Test Novel',
                createdAt: Date.now(),
                archived: false,
            });

            await v8Db.table('nodes').add({
                id: 'test-scene-1',
                projectId: 'test-project-1',
                parentId: null,
                type: 'scene',
                order: 0,
            });

            v8Db.close();

            // 2. Open with v9 schema (triggers migration)
            const v9Db = new Dexie('TestNovelDB');
            v9Db.version(9).stores({
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
                emergencyBackups: 'id, sceneId, expiresAt', // NEW in v9
            });
            v9Db.version(8).stores({
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
            });

            testDb = v9Db;

            // 3. Verify data preserved
            const project = await v9Db.table('projects').get('test-project-1');
            expect(project).toBeDefined();
            expect(project?.title).toBe('Test Novel');

            const node = await v9Db.table('nodes').get('test-scene-1');
            expect(node).toBeDefined();
            expect(node?.projectId).toBe('test-project-1');

            // 4. Verify new table exists and is usable
            const tables = v9Db.tables.map(t => t.name);
            expect(tables).toContain('emergencyBackups');

            // 5. Verify we can write to new table
            await v9Db.table('emergencyBackups').add({
                id: 'backup-1',
                sceneId: 'test-scene-1',
                content: { text: 'backup content' },
                createdAt: Date.now(),
                expiresAt: Date.now() + 3600000,
            });

            const backup = await v9Db.table('emergencyBackups').get('backup-1');
            expect(backup).toBeDefined();
            expect(backup?.sceneId).toBe('test-scene-1');
        });
    });

    describe('emergencyBackups table', () => {
        it('should support querying by sceneId', async () => {
            const db = new Dexie('TestNovelDB');
            db.version(9).stores({
                emergencyBackups: 'id, sceneId, expiresAt',
            });
            testDb = db;

            // Add multiple backups
            await db.table('emergencyBackups').bulkAdd([
                { id: 'b1', sceneId: 'scene-1', expiresAt: Date.now() + 3600000 },
                { id: 'b2', sceneId: 'scene-1', expiresAt: Date.now() + 3600000 },
                { id: 'b3', sceneId: 'scene-2', expiresAt: Date.now() + 3600000 },
            ]);

            // Query by sceneId
            const scene1Backups = await db.table('emergencyBackups')
                .where('sceneId')
                .equals('scene-1')
                .toArray();

            expect(scene1Backups).toHaveLength(2);
        });

        it('should support querying by expiresAt for cleanup', async () => {
            const db = new Dexie('TestNovelDB');
            db.version(9).stores({
                emergencyBackups: 'id, sceneId, expiresAt',
            });
            testDb = db;

            const now = Date.now();

            // Add expired and valid backups
            await db.table('emergencyBackups').bulkAdd([
                { id: 'expired-1', sceneId: 's1', expiresAt: now - 1000 }, // Expired
                { id: 'expired-2', sceneId: 's2', expiresAt: now - 2000 }, // Expired
                { id: 'valid-1', sceneId: 's3', expiresAt: now + 3600000 }, // Valid
            ]);

            // Query expired backups
            const expired = await db.table('emergencyBackups')
                .where('expiresAt')
                .below(now)
                .toArray();

            expect(expired).toHaveLength(2);
            expect(expired.every(b => b.id.startsWith('expired'))).toBe(true);
        });
    });
});
