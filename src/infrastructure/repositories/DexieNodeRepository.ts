import { db } from '@/lib/core/database';
import type { DocumentNode, Scene } from '@/lib/config/types';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import { serializeForStorage } from './repository-helpers';

/**
 * Dexie implementation of INodeRepository
 * Wraps all Dexie database calls for document nodes
 */
export class DexieNodeRepository implements INodeRepository {
    async get(id: string): Promise<DocumentNode | Scene | undefined> {
        return await db.nodes.get(id);
    }

    async getByProject(projectId: string): Promise<(DocumentNode | Scene)[]> {
        return await db.nodes.where('projectId').equals(projectId).sortBy('order');
    }

    async getByParent(projectId: string, parentId: string | null): Promise<(DocumentNode | Scene)[]> {
        return await db.nodes
            .where('projectId').equals(projectId)
            .filter(n => n.parentId === parentId)
            .toArray();
    }

    async getChildren(parentId: string): Promise<(DocumentNode | Scene)[]> {
        return await db.nodes.where('parentId').equals(parentId).toArray();
    }

    async create(node: Partial<DocumentNode | Scene> & { projectId: string; type: 'act' | 'chapter' | 'scene' }): Promise<DocumentNode | Scene> {
        const newNode: any = {
            id: crypto.randomUUID(),
            parentId: null,
            title: 'Untitled',
            order: Date.now(), // Use timestamp for default ordering
            expanded: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...node,
        };

        // Scene-specific defaults
        if (node.type === 'scene') {
            newNode.content = newNode.content || { type: 'doc', content: [] };
            newNode.summary = newNode.summary || '';
            newNode.status = newNode.status || 'draft';
            newNode.wordCount = newNode.wordCount || 0;
        }

        // ✅ Serialize before storing to remove any non-serializable data (Promises, functions, circular refs)
        const cleanNode = serializeForStorage(newNode);
        await db.nodes.add(cleanNode);

        return newNode;
    }

    async update(id: string, data: Partial<DocumentNode | Scene>): Promise<void> {
        await db.nodes.update(id, {
            ...data,
            updatedAt: Date.now(),
        });
    }

    async updateMetadata(id: string, metadata: Partial<Scene>): Promise<void> {
        // Delegate to update method
        await this.update(id, metadata);
    }

    async delete(id: string): Promise<void> {
        await db.nodes.delete(id);
    }

    async deleteCascade(id: string, type: 'act' | 'chapter' | 'scene'): Promise<void> {
        // ✅ TRANSACTION: All deletes are atomic - either all succeed or all fail
        await db.transaction('rw', db.nodes, async () => {
            if (type === 'scene') {
                // Just delete the scene
                await db.nodes.delete(id);
            } else if (type === 'chapter') {
                // Delete all scenes in the chapter
                const scenes = await db.nodes.where('parentId').equals(id).toArray();

                if (scenes.length > 0) {
                    await db.nodes.bulkDelete(scenes.map(s => s.id));
                }

                // Delete the chapter
                await db.nodes.delete(id);
            } else if (type === 'act') {
                // Find all chapters in the act
                const chapters = await db.nodes.where('parentId').equals(id).toArray();
                const chapterIds = chapters.map(c => c.id);

                // Find all scenes in those chapters
                const scenes = await db.nodes.where('parentId').anyOf(chapterIds).toArray();

                // Delete scenes, then chapters, then act (all atomic)
                if (scenes.length > 0) {
                    await db.nodes.bulkDelete(scenes.map(s => s.id));
                }
                if (chapterIds.length > 0) {
                    await db.nodes.bulkDelete(chapterIds);
                }
                await db.nodes.delete(id);
            }
        });
        // If any operation fails, entire transaction rolls back automatically
    }

    async bulkDelete(ids: string[]): Promise<void> {
        // ✅ TRANSACTION: Bulk delete is atomic
        await db.transaction('rw', db.nodes, async () => {
            await db.nodes.bulkDelete(ids);
        });
    }
}
