import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import { useConfirmation } from '@/hooks/use-confirmation';
import { toast } from '@/shared/utils/toast-service';
import { saveCoordinator } from '@/lib/core/save-coordinator';

/**
 * Centralized Node Deletion Service
 * Consolidates all node deletion logic (18 duplicate handlers → 1 service)
 * Handles cascade delete with user confirmation
 */
export class NodeDeletionService {
    constructor(private nodeRepository: INodeRepository) { }

    /**
     * Delete a node with confirmation and cascade delete
     * @param nodeId - ID of the node to delete
     * @param nodeType - Type of node (act, chapter, scene)
     * @param confirmFn - Confirmation function from useConfirmation hook
     * @returns Promise<boolean> - true if deleted, false if cancelled
     */
    async deleteWithConfirmation(
        nodeId: string,
        nodeType: 'act' | 'chapter' | 'scene',
        confirmFn: (options: {
            title: string;
            description: string;
            confirmText: string;
            variant: 'destructive' | 'default';
        }) => Promise<boolean>
    ): Promise<boolean> {
        // Get confirmation messages based on node type
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
            saveCoordinator.cancelPendingSaves(nodeId);

            // Use repository's cascade delete
            await this.nodeRepository.deleteCascade(nodeId, nodeType);
            toast.success(messages.successMessage);
            return true;
        } catch (error) {
            console.error('Failed to delete node:', error);
            toast.error('Failed to delete. Please try again.');
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
        confirmFn: (options: {
            title: string;
            description: string;
            confirmText: string;
            variant: 'destructive' | 'default';
        }) => Promise<boolean>
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
            toast.success(`${nodeIds.length} items deleted successfully`);
            return true;
        } catch (error) {
            console.error('Failed to bulk delete:', error);
            toast.error('Failed to delete items. Please try again.');
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

/**
 * React Hook to use Node Deletion Service
 * Combines repository access with confirmation dialog
 */
export function useNodeDeletion(nodeRepository: INodeRepository) {
    const { confirm, ConfirmationDialog } = useConfirmation();

    const deletionService = new NodeDeletionService(nodeRepository);

    const deleteNode = async (
        nodeId: string,
        nodeType: 'act' | 'chapter' | 'scene'
    ): Promise<boolean> => {
        return await deletionService.deleteWithConfirmation(nodeId, nodeType, confirm);
    };

    const bulkDeleteNodes = async (nodeIds: string[]): Promise<boolean> => {
        return await deletionService.bulkDeleteWithConfirmation(nodeIds, confirm);
    };

    return {
        deleteNode,
        bulkDeleteNodes,
        ConfirmationDialog,
    };
}
