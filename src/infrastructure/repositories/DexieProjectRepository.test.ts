import { describe, it, expect, beforeEach } from 'vitest';
import { DexieProjectRepository } from '@/infrastructure/repositories/DexieProjectRepository';
import { db } from '@/lib/core/database';

describe('DexieProjectRepository', () => {
    let repo: DexieProjectRepository;

    beforeEach(async () => {
        repo = new DexieProjectRepository();

        // Clear database before each test
        await db.delete();
        await db.open();
    });

    describe('create', () => {
        it('should create project with valid data', async () => {
            const project = await repo.create({
                title: 'Test Project',
                author: 'Test Author',
                language: 'English (US)',
            });

            expect(project.id).toBeDefined();
            expect(project.title).toBe('Test Project');
            expect(project.author).toBe('Test Author');
            expect(project.createdAt).toBeDefined();
            expect(project.updatedAt).toBeDefined();
        });

        it('should reject project with empty title', async () => {
            await expect(
                repo.create({
                    title: '',
                    author: 'Test Author',
                    language: 'English (US)',
                })
            ).rejects.toThrow();
        });

        it('should reject project with missing required fields', async () => {
            await expect(
                repo.create({
                    title: 'Test Project',
                    // Missing author
                } as any)
            ).rejects.toThrow();
        });

        it('should generate unique IDs for multiple projects', async () => {
            const project1 = await repo.create({
                title: 'Project 1',
                author: 'Author 1',
                language: 'English (US)',
            });

            const project2 = await repo.create({
                title: 'Project 2',
                author: 'Author 2',
                language: 'English (US)',
            });

            expect(project1.id).not.toBe(project2.id);
        });
    });

    describe('get', () => {
        it('should retrieve project by ID', async () => {
            const created = await repo.create({
                title: 'Test Project',
                author: 'Test Author',
                language: 'English (US)',
            });

            const retrieved = await repo.get(created.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(created.id);
            expect(retrieved?.title).toBe('Test Project');
        });

        it('should return undefined for non-existent project', async () => {
            const result = await repo.get('non-existent-id');
            expect(result).toBeUndefined();
        });
    });

    describe('getAll', () => {
        it('should return all projects', async () => {
            await repo.create({
                title: 'Project 1',
                author: 'Author 1',
                language: 'English (US)',
            });

            await repo.create({
                title: 'Project 2',
                author: 'Author 2',
                language: 'English (US)',
            });

            const allProjects = await repo.getAll();
            expect(allProjects).toHaveLength(2);
        });

        it('should return empty array when no projects exist', async () => {
            const allProjects = await repo.getAll();
            expect(allProjects).toHaveLength(0);
        });
    });

    describe('update', () => {
        it('should update project title', async () => {
            const project = await repo.create({
                title: 'Original Title',
                author: 'Test Author',
                language: 'English (US)',
            });

            await repo.update(project.id, { title: 'Updated Title' });

            const updated = await repo.get(project.id);
            expect(updated?.title).toBe('Updated Title');
            expect(updated?.updatedAt).toBeGreaterThan(project.updatedAt);
        });
    });

    describe('archive', () => {
        it('should archive project', async () => {
            const project = await repo.create({
                title: 'Test Project',
                author: 'Test Author',
                language: 'English (US)',
            });

            await repo.archive(project.id);

            const archived = await repo.get(project.id);
            expect(archived?.archived).toBe(true);
        });

        it('should filter archived projects in getAllActive', async () => {
            const project1 = await repo.create({
                title: 'Active Project',
                author: 'Test Author',
                language: 'English (US)',
            });

            const project2 = await repo.create({
                title: 'Archived Project',
                author: 'Test Author',
                language: 'English (US)',
            });

            await repo.archive(project2.id);

            const activeProjects = await repo.getAllActive();
            expect(activeProjects).toHaveLength(1);
            expect(activeProjects[0].id).toBe(project1.id);
        });
    });

    describe('deleteWithRelatedData', () => {
        it('should delete project', async () => {
            const project = await repo.create({
                title: 'Test Project',
                author: 'Test Author',
                language: 'English (US)',
            });

            await repo.deleteWithRelatedData(project.id);

            const deleted = await repo.get(project.id);
            expect(deleted).toBeUndefined();
        });

        it('should delete project atomically', async () => {
            const project = await repo.create({
                title: 'Test Project',
                author: 'Test Author',
                language: 'English (US)',
            });

            // Create related node
            await db.nodes.add({
                id: crypto.randomUUID(),
                projectId: project.id,
                type: 'act',
                title: 'Test Act',
                order: 0,
                parentId: null,
                expanded: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await repo.deleteWithRelatedData(project.id);

            // Verify project deleted
            const deletedProject = await repo.get(project.id);
            expect(deletedProject).toBeUndefined();

            // Verify related nodes deleted
            const remainingNodes = await db.nodes
                .where('projectId')
                .equals(project.id)
                .toArray();
            expect(remainingNodes).toHaveLength(0);
        });
    });
});
