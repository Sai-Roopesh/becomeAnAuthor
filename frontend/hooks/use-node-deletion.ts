'use client';

import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import { NodeDeletionService } from '@/infrastructure/services/NodeDeletionService';
import { useConfirmation } from '@/hooks/use-confirmation';
import { toast } from '@/shared/utils/toast-service';
import { saveCoordinator } from '@/lib/core/save-coordinator';

/**
 * React Hook for Node Deletion
 * 
 * Wires up the pure NodeDeletionService with React-specific 
 * dependencies (confirmation dialog, toast, save coordinator).
 */
export function useNodeDeletion(nodeRepository: INodeRepository) {
    const { confirm, ConfirmationDialog } = useConfirmation();

    const deletionService = new NodeDeletionService(
        nodeRepository,
        (nodeId: string) => saveCoordinator.cancelPendingSaves(nodeId),
        { success: toast.success, error: toast.error }
    );

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
