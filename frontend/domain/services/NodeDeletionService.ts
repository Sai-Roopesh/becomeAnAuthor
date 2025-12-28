import type { INodeRepository } from '@/domain/repositories/INodeRepository';

/**
 * Confirmation options for deletion dialogs
 */
export interface DeletionConfirmOptions {
    title: string;
    description: string;
    confirmText: string;
    variant: 'destructive' | 'default';
}

/**
 * Confirmation function type (injected from React layer)
 */
export type ConfirmationFn = (options: DeletionConfirmOptions) => Promise<boolean>;

/**
 * Callback for canceling pending saves
 */
export type CancelSavesFn = (nodeId: string) => void;

/**
 * Toast notification callbacks
 */
export interface ToastCallbacks {
    success: (message: string) => void;
    error: (message: string) => void;
}

/**
 * Node Deletion Service - Pure Domain Logic
 * 
 * Consolidates all node deletion logic (18 duplicate handlers → 1 service).
 * Handles cascade delete with injectable confirmation.
 * 
 * Note: This is a pure domain service. React integration is handled
 * by the useNodeDeletion hook in /hooks/use-node-deletion.ts
 */
export class NodeDeletionService {
    constructor(
        private nodeRepository: INodeRepository,
        private cancelSaves: CancelSavesFn,
        private toast: ToastCallbacks
    ) { }

    /**
     * Delete a node with confirmation and cascade delete
     * @param nodeId - ID of the node to delete
     * @param nodeType - Type of node (act, chapter, scene)
     * @param confirmFn - Confirmation function (injected from React)
     * @returns Promise<boolean> - true if deleted, false if cancelled
     */
    async deleteWithConfirmation(
        nodeId: string,
        nodeType: 'act' | 'chapter' | 'scene',
        confirmFn: ConfirmationFn
    ): Promise<boolean> {
        const messages = this.getConfirmationMessages(nodeType);

        const confirmed = await confirmFn({
            title: messages.title,
            description: messages.description,
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (!confirmed) {
            return false;
        }

        try {
            // Cancel any pending saves for this node (prevents race conditions)
            this.cancelSaves(nodeId);

            // Use repository's cascade delete
            await this.nodeRepository.deleteCascade(nodeId, nodeType);
            this.toast.success(messages.successMessage);
            return true;
        } catch (error) {
            console.error('Failed to delete node:', error);
            this.toast.error('Failed to delete. Please try again.');
            return false;
        }
    }

    /**
     * Delete multiple nodes with confirmation
     * @param nodeIds - Array of node IDs to delete
     * @param confirmFn - Confirmation function
     * @returns Promise<boolean> - true if deleted, false if cancelled
     */
    async bulkDeleteWithConfirmation(
        nodeIds: string[],
        confirmFn: ConfirmationFn
    ): Promise<boolean> {
        const confirmed = await confirmFn({
            title: 'Delete Selected Items',
            description: `Are you sure you want to delete ${nodeIds.length} items? This action cannot be undone.`,
            confirmText: 'Delete All',
            variant: 'destructive'
        });

        if (!confirmed) {
            return false;
        }

        try {
            await this.nodeRepository.bulkDelete(nodeIds);
            this.toast.success(`${nodeIds.length} items deleted successfully`);
            return true;
        } catch (error) {
            console.error('Failed to bulk delete:', error);
            this.toast.error('Failed to delete items. Please try again.');
            return false;
        }
    }

    /**
     * Get confirmation messages based on node type
     */
    private getConfirmationMessages(nodeType: 'act' | 'chapter' | 'scene') {
        const typeLabel = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);

        const cascadeInfo: Record<typeof nodeType, string> = {
            act: 'This will also delete all chapters and scenes within this act.',
            chapter: 'This will also delete all scenes within this chapter.',
            scene: 'This action cannot be undone.'
        };

        return {
            title: `Delete ${typeLabel}`,
            description: `Are you sure you want to delete this ${nodeType}? ${cascadeInfo[nodeType]}`,
            successMessage: `${typeLabel} deleted successfully`
        };
    }
}
