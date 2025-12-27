import type { DocumentNode, Scene, Act, Chapter } from '@/domain/entities/types';

/**
 * Repository interface for document nodes (Acts, Chapters, Scenes)
 * Decouples business logic from Dexie implementation
 */
export interface INodeRepository {
    /**
     * Get a single node by ID
     */
    get(id: string): Promise<DocumentNode | Scene | undefined>;

    /**
     * Get all nodes for a project, sorted by order
     */
    getByProject(projectId: string): Promise<(DocumentNode | Scene)[]>;

    /**
     * Get nodes by parent ID (for CreateNodeDialog)
     * Returns nodes with matching parentId
     */
    getByParent(projectId: string, parentId: string | null): Promise<(DocumentNode | Scene)[]>;

    /**
     * Get children of a specific node
     */
    getChildren(parentId: string): Promise<(DocumentNode | Scene)[]>;

    /**
     * Create a new node
     */
    create(node: Partial<DocumentNode | Scene> & { projectId: string; type: 'act' | 'chapter' | 'scene' }): Promise<DocumentNode | Scene>;

    /**
     * Update an existing node
     */
    update(id: string, data: Partial<DocumentNode | Scene>): Promise<void>;

    /**
     * Update node metadata (POV, subtitle, excludeFromAI, etc.)
     * Convenience method for NodeActionsMenu
     */
    updateMetadata(id: string, metadata: Partial<Scene>): Promise<void>;

    /**
     * Delete a single node (no cascade)
     */
    delete(id: string): Promise<void>;

    /**
     * Delete a node and all its children (cascade)
     * - Deleting Act: deletes all Chapters and Scenes
     * - Deleting Chapter: deletes all Scenes
     * - Deleting Scene: deletes just the Scene
     */
    deleteCascade(id: string, type: 'act' | 'chapter' | 'scene'): Promise<void>;

    /**
     * Bulk delete multiple nodes
     */
    bulkDelete(ids: string[]): Promise<void>;

    /**
     * Get the current project path
     */
    getProjectPath(): string | null;
}
