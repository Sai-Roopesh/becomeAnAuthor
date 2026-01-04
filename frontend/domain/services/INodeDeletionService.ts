/**
 * Node Deletion Service Interface
 * 
 * Domain interface for node deletion operations.
 * Implementation is in infrastructure/services/NodeDeletionService.ts
 */

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
 * Node Deletion Service Interface
 * Consolidates all node deletion logic with injectable confirmation.
 */
export interface INodeDeletionService {
    /**
     * Delete a node with confirmation and cascade delete
     * @param nodeId - ID of the node to delete
     * @param nodeType - Type of node (act, chapter, scene)
     * @param confirmFn - Confirmation function (injected from React)
     * @returns Promise<boolean> - true if deleted, false if cancelled
     */
    deleteWithConfirmation(
        nodeId: string,
        nodeType: 'act' | 'chapter' | 'scene',
        confirmFn: ConfirmationFn
    ): Promise<boolean>;

    /**
     * Delete multiple nodes with confirmation
     * @param nodeIds - Array of node IDs to delete
     * @param confirmFn - Confirmation function
     * @returns Promise<boolean> - true if deleted, false if cancelled
     */
    bulkDeleteWithConfirmation(
        nodeIds: string[],
        confirmFn: ConfirmationFn
    ): Promise<boolean>;
}
