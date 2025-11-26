import { db } from '@/lib/core/database';
import type { Project } from '@/lib/config/types';

/**
 * Repository for Project entity
 * Handles all database operations for projects
 */
export class DexieProjectRepository {
    /**
     * Get a single project by ID
     */
    async get(id: string): Promise<Project | undefined> {
        return await db.projects.get(id);
    }

    /**
     * Get all projects
     */
    async getAll(): Promise<Project[]> {
        return await db.projects.toArray();
    }

    /**
     * Get all non-archived projects
     */
    async getAllActive(): Promise<Project[]> {
        return await db.projects.where('archived').notEqual(true).toArray();
    }

    /**
   * Create a new project
   * ✅ VALIDATION: Validates data before database write
   */
    async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
        // Import and validate using Zod schema
        const { ProjectSchema } = await import('@/lib/schemas');

        const projectData = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...project,
        };

        // Validate before inserting
        const validatedProject = ProjectSchema.parse(projectData);

        await db.projects.add(validatedProject);
        return validatedProject;
    }

    /**
     * Update a project
     */
    async update(id: string, changes: Partial<Project>): Promise<void> {
        await db.projects.update(id, {
            ...changes,
            updatedAt: Date.now(),
        });
    }

    /**
     * Archive a project (soft delete)
     */
    async archive(id: string): Promise<void> {
        await db.projects.update(id, {
            archived: true,
            updatedAt: Date.now(),
        });
    }

    /**
     * Delete a project and all its related data atomically
     * ✅ TRANSACTION: Ensures all-or-nothing deletion
     */
    async deleteWithRelatedData(projectId: string): Promise<void> {
        await db.transaction(
            'rw',
            [db.projects, db.nodes, db.codex, db.snippets, db.chatThreads, db.chatMessages],
            async () => {
                // Delete all related data first
                await db.nodes.where('projectId').equals(projectId).delete();
                await db.codex.where('projectId').equals(projectId).delete();
                await db.snippets.where('projectId').equals(projectId).delete();

                // Delete chat threads and their messages
                const threads = await db.chatThreads.where('projectId').equals(projectId).toArray();
                const threadIds = threads.map((t) => t.id);
                if (threadIds.length > 0) {
                    await db.chatMessages.where('threadId').anyOf(threadIds).delete();
                    await db.chatThreads.bulkDelete(threadIds);
                }

                // Finally delete the project itself
                await db.projects.delete(projectId);
            }
        );
    }
}
