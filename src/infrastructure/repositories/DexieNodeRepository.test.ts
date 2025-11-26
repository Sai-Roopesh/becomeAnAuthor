import { describe, it, expect, beforeEach } from 'vitest';
import { DexieNodeRepository } from '@/infrastructure/repositories/DexieNodeRepository';
import { db } from '@/lib/core/database';

describe('DexieNodeRepository', () => {
    let repo: DexieNodeRepository;
    let testProjectId: string;

    beforeEach(async () => {
        repo = new DexieNodeRepository();
        testProjectId = crypto.randomUUID();

        // Clear database before each test
        await db.delete();
        await db.open();

        // Create test project
        await db.projects.add({
            id: testProjectId,
            title: 'Test Project',
            author: 'Test Author',
            language: 'English (US)',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    });

    describe('deleteCascade', () => {
        it('should delete act and its children atomically', async () => {
            const actId = crypto.randomUUID();
            const chapterId = crypto.randomUUID();
            const sceneId = crypto.randomUUID();

            // Create hierarchy: Act > Chapter > Scene
            await db.nodes.add({
                id: actId,
                projectId: testProjectId,
                type: 'act',
                title: 'Act 1',
                order: 0,
                parentId: null,
                expanded: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: chapterId,
                projectId: testProjectId,
                type: 'chapter',
                title: 'Chapter 1',
                order: 0,
                parentId: actId,
                expanded: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: sceneId,
                projectId: testProjectId,
                type: 'scene',
                title: 'Scene 1',
                order: 0,
                parentId: chapterId,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            // Delete act (should cascade to chapter and scene)
            await repo.deleteCascade(actId, 'act');

            // Verify all deleted
            const deletedAct = await db.nodes.get(actId);
            const deletedChapter = await db.nodes.get(chapterId);
            const deletedScene = await db.nodes.get(sceneId);

            expect(deletedAct).toBeUndefined();
            expect(deletedChapter).toBeUndefined();
            expect(deletedScene).toBeUndefined();
        });

        it('should delete chapter and its scenes atomically', async () => {
            const actId = crypto.randomUUID();
            const chapterId = crypto.randomUUID();
            const scene1Id = crypto.randomUUID();
            const scene2Id = crypto.randomUUID();

            await db.nodes.add({
                id: actId,
                projectId: testProjectId,
                type: 'act',
                title: 'Act 1',
                order: 0,
                parentId: null,
                expanded: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: chapterId,
                projectId: testProjectId,
                type: 'chapter',
                title: 'Chapter 1',
                order: 0,
                parentId: actId,
                expanded: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: scene1Id,
                projectId: testProjectId,
                type: 'scene',
                title: 'Scene 1',
                order: 0,
                parentId: chapterId,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: scene2Id,
                projectId: testProjectId,
                type: 'scene',
                title: 'Scene 2',
                order: 1,
                parentId: chapterId,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            // Delete chapter (should cascade to scenes only, not act)
            await repo.deleteCascade(chapterId, 'chapter');

            // Verify chapter and scenes deleted
            const deletedChapter = await db.nodes.get(chapterId);
            const deletedScene1 = await db.nodes.get(scene1Id);
            const deletedScene2 = await db.nodes.get(scene2Id);

            expect(deletedChapter).toBeUndefined();
            expect(deletedScene1).toBeUndefined();
            expect(deletedScene2).toBeUndefined();

            // Verify act still exists
            const existingAct = await db.nodes.get(actId);
            expect(existingAct).toBeDefined();
        });

        it('should delete single scene without affecting siblings', async () => {
            const chapterId = crypto.randomUUID();
            const scene1Id = crypto.randomUUID();
            const scene2Id = crypto.randomUUID();

            await db.nodes.add({
                id: chapterId,
                projectId: testProjectId,
                type: 'chapter',
                title: 'Chapter 1',
                order: 0,
                parentId: null,
                expanded: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: scene1Id,
                projectId: testProjectId,
                type: 'scene',
                title: 'Scene 1',
                order: 0,
                parentId: chapterId,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: scene2Id,
                projectId: testProjectId,
                type: 'scene',
                title: 'Scene 2',
                order: 1,
                parentId: chapterId,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            // Delete one scene
            await repo.deleteCascade(scene1Id, 'scene');

            // Verify only scene1 deleted
            const deletedScene = await db.nodes.get(scene1Id);
            expect(deletedScene).toBeUndefined();

            // Verify scene2 and chapter still exist
            const existingScene2 = await db.nodes.get(scene2Id);
            const existingChapter = await db.nodes.get(chapterId);

            expect(existingScene2).toBeDefined();
            expect(existingChapter).toBeDefined();
        });
    });

    describe('bulkDelete', () => {
        it('should delete multiple nodes atomically', async () => {
            const scene1Id = crypto.randomUUID();
            const scene2Id = crypto.randomUUID();

            await db.nodes.add({
                id: scene1Id,
                projectId: testProjectId,
                type: 'scene',
                title: 'Scene 1',
                order: 0,
                parentId: null,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await db.nodes.add({
                id: scene2Id,
                projectId: testProjectId,
                type: 'scene',
                title: 'Scene 2',
                order: 1,
                parentId: null,
                content: { type: 'doc', content: [] },
                expanded: false,
                status: 'draft',
                wordCount: 0,
                summary: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            // Bulk delete
            await repo.bulkDelete([scene1Id, scene2Id]);

            // Verify both deleted
            const deleted1 = await db.nodes.get(scene1Id);
            const deleted2 = await db.nodes.get(scene2Id);

            expect(deleted1).toBeUndefined();
            expect(deleted2).toBeUndefined();
        });
    });
});
