/**
 * Tauri Node Repository
 * Implements INodeRepository using file system through Tauri commands
 * Falls back to IndexedDB when not running in Tauri
 */

import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { DocumentNode, Scene } from '@/domain/entities/types';
import {
    isTauri,
    getStructure,
    saveStructure,
    createNode,
    loadScene,
    saveScene,
    deleteScene,
    type StructureNode,
    type Scene as TauriScene
} from '@/core/tauri';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('TauriNodeRepository');

/**
 * Convert Tauri structure to app's node format
 */
function structureNodeToDocumentNode(node: StructureNode, projectId: string, parentId: string | null): DocumentNode | Scene {
    const now = Date.now();
    const baseNode = {
        id: node.id,
        projectId,
        parentId,
        title: node.title,
        order: node.order,
        expanded: true,
        createdAt: now,
        updatedAt: now,
    };

    if (node.type === 'scene') {
        return {
            ...baseNode,
            type: 'scene' as const,
            content: { type: 'doc', content: [] },
            summary: '',
            status: 'draft' as const,
            wordCount: 0,
            _tauriFile: node.file, // Store file reference for loading content
        } as Scene & { _tauriFile?: string };
    }

    return {
        ...baseNode,
        type: node.type as 'act' | 'chapter',
    } as DocumentNode;
}

/**
 * Flatten structure tree to array
 */
function flattenStructure(nodes: StructureNode[], projectId: string, parentId: string | null = null): (DocumentNode | Scene)[] {
    const result: (DocumentNode | Scene)[] = [];

    for (const node of nodes) {
        result.push(structureNodeToDocumentNode(node, projectId, parentId));
        if (node.children?.length) {
            result.push(...flattenStructure(node.children, projectId, node.id));
        }
    }

    return result;
}

/**
 * Tauri-based Node Repository
 * Only used when running in Tauri desktop app
 * 
 * Note: Uses instance-level project path to avoid global mutable state.
 * Access via singleton getInstance() or create with specific path.
 */
export class TauriNodeRepository implements INodeRepository {
    private projectPath: string | null = null;

    // Singleton instance for default usage
    private static instance: TauriNodeRepository | null = null;

    static getInstance(): TauriNodeRepository {
        if (!TauriNodeRepository.instance) {
            TauriNodeRepository.instance = new TauriNodeRepository();
        }
        return TauriNodeRepository.instance;
    }

    /**
     * Set the project path for this repository instance
     */
    setProjectPath(path: string | null): void {
        this.projectPath = path;
    }

    /**
     * Get the current project path
     */
    getProjectPath(): string | null {
        return this.projectPath;
    }

    async get(id: string): Promise<DocumentNode | Scene | undefined> {
        if (!this.projectPath) return undefined;

        const structure = await getStructure(this.projectPath);
        const allNodes = flattenStructure(structure, 'current');
        const node = allNodes.find(n => n.id === id);

        // If it's a scene, load the content
        if (node && node.type === 'scene') {
            const tauriNode = node as Scene & { _tauriFile?: string };
            if (tauriNode._tauriFile) {
                try {
                    const scene = await loadScene(this.projectPath, tauriNode._tauriFile);

                    // CRITICAL FIX: Parse content as JSON - backend saves it as stringified JSON
                    let parsedContent;
                    try {
                        parsedContent = typeof scene.content === 'string'
                            ? JSON.parse(scene.content)
                            : scene.content;
                    } catch {
                        // Fallback if content isn't valid JSON
                        parsedContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: scene.content }] }] };
                    }

                    return {
                        ...node,
                        content: parsedContent,
                        wordCount: scene.meta.word_count,
                        status: scene.meta.status,
                    } as Scene;
                } catch {
                    return node;
                }
            }
        }

        return node;
    }

    async getByProject(projectId: string): Promise<(DocumentNode | Scene)[]> {
        if (!this.projectPath) return [];

        const structure = await getStructure(this.projectPath);
        return flattenStructure(structure, projectId);
    }

    async getByParent(projectId: string, parentId: string | null): Promise<(DocumentNode | Scene)[]> {
        if (!this.projectPath) return [];

        const structure = await getStructure(this.projectPath);

        if (parentId === null) {
            // Return root level nodes
            return structure.map((n: StructureNode) => structureNodeToDocumentNode(n, projectId, null));
        }

        // Find parent and return its children
        const findChildren = (nodes: StructureNode[], targetId: string): StructureNode[] => {
            for (const node of nodes) {
                if (node.id === targetId) {
                    return node.children || [];
                }
                const found = findChildren(node.children || [], targetId);
                if (found.length) return found;
            }
            return [];
        };

        const children = findChildren(structure, parentId);
        return children.map(n => structureNodeToDocumentNode(n, projectId, parentId));
    }

    async getChildren(parentId: string): Promise<(DocumentNode | Scene)[]> {
        return this.getByParent('current', parentId);
    }

    async create(node: Partial<DocumentNode | Scene> & { projectId: string; type: 'act' | 'chapter' | 'scene' }): Promise<DocumentNode | Scene> {
        if (!this.projectPath) {
            throw new Error('No project path set');
        }

        const parentId = (node as any).parentId || null;
        const createdNode = await createNode(
            this.projectPath,
            parentId,
            node.type,
            node.title || 'Untitled'
        );

        return structureNodeToDocumentNode(createdNode, node.projectId, parentId);
    }

    async update(id: string, data: Partial<DocumentNode | Scene>): Promise<void> {
        log.debug('update called', { id, data, projectPath: this.projectPath });

        if (!this.projectPath) {
            log.warn('No project path set - returning early');
            return;
        }

        // If updating scene content, save to file
        if ('content' in data && data.content) {
            log.debug('Updating scene content');
            const structure = await getStructure(this.projectPath);
            const allNodes = flattenStructure(structure, 'current');
            const node = allNodes.find(n => n.id === id) as Scene & { _tauriFile?: string } | undefined;

            if (node?._tauriFile) {
                // saveScene expects TiptapContent object, not string
                await saveScene(this.projectPath, node._tauriFile, data.content, data.title);
                log.debug('Scene content saved');
            }
        }


        // Update structure if title changed
        if (data.title) {
            log.debug('Updating title', { newTitle: data.title });
            const structure = await getStructure(this.projectPath);
            log.debug('Got structure, updating...');

            const updateNodeTitle = (nodes: StructureNode[]): boolean => {
                for (const node of nodes) {
                    if (node.id === id) {
                        log.debug('Found node, updating title', { from: node.title, to: data.title });
                        node.title = data.title!;
                        return true;
                    }
                    if (updateNodeTitle(node.children || [])) return true;
                }
                return false;
            };

            const updated = updateNodeTitle(structure);
            log.debug('Title update result', { updated });

            if (updated) {
                log.debug('Saving structure...');
                await saveStructure(this.projectPath, structure);
                log.debug('Structure saved successfully');
            } else {
                log.warn('Node not found in structure!');
            }
        }

        log.debug('Update complete');
    }

    async updateMetadata(id: string, metadata: Partial<Scene>): Promise<void> {
        // For now, just update title if provided
        if (metadata.title) {
            await this.update(id, { title: metadata.title });
        }
    }

    async delete(id: string): Promise<void> {
        if (!this.projectPath) return;

        const structure = await getStructure(this.projectPath);

        // Find and remove node
        const removeNode = (nodes: StructureNode[], targetId: string): StructureNode | null => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i] && nodes[i]!.id === targetId) {
                    const removed = nodes.splice(i, 1)[0];
                    return removed ?? null;
                }
                const found = nodes[i] ? removeNode(nodes[i]!.children || [], targetId) : null;
                if (found) return found;
            }
            return null;
        };

        const removed = removeNode(structure, id);

        if (removed) {
            // If scene, delete the file
            if (removed.file) {
                await deleteScene(this.projectPath, removed.file);
            }

            await saveStructure(this.projectPath, structure);
        }
    }

    async deleteCascade(id: string, type: 'act' | 'chapter' | 'scene'): Promise<void> {
        if (!this.projectPath) return;

        const structure = await getStructure(this.projectPath);

        // Collect all scene files to delete
        const collectSceneFiles = (nodes: StructureNode[]): string[] => {
            const files: string[] = [];
            for (const node of nodes) {
                if (node.file) files.push(node.file);
                files.push(...collectSceneFiles(node.children || []));
            }
            return files;
        };

        const removeNode = (nodes: StructureNode[], targetId: string): StructureNode | null => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i] && nodes[i]!.id === targetId) {
                    return nodes.splice(i, 1)[0] ?? null;
                }
                const found = nodes[i] ? removeNode(nodes[i]!.children || [], targetId) : null;
                if (found) return found;
            }
            return null;
        };

        const removed = removeNode(structure, id);

        if (removed) {
            // Delete all scene files in the subtree
            const sceneFiles = [
                ...(removed.file ? [removed.file] : []),
                ...collectSceneFiles(removed.children || [])
            ];

            for (const file of sceneFiles) {
                await deleteScene(this.projectPath, file);
            }

            await saveStructure(this.projectPath, structure);
        }
    }

    async bulkDelete(ids: string[]): Promise<void> {
        for (const id of ids) {
            await this.delete(id);
        }
    }
}
