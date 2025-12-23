/**
 * Trash Service - Soft Delete with Recovery
 * 
 * Provides a way to recover deleted items before permanent deletion.
 * Items are moved to a trash folder and tracked in trash.json.
 */
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/shared/utils/toast-service';

export interface TrashItem {
    id: string;
    originalPath: string;
    name: string;
    type: 'scene' | 'codex' | 'snippet' | 'chapter' | 'act';
    deletedAt: number;
    expiresAt: number; // 30 days after deletion
}

const RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Move an item to trash instead of permanently deleting
 */
export async function moveToTrash(
    projectPath: string,
    itemId: string,
    itemName: string,
    itemType: TrashItem['type']
): Promise<void> {
    try {
        const trashItem: TrashItem = {
            id: itemId,
            originalPath: projectPath,
            name: itemName,
            type: itemType,
            deletedAt: Date.now(),
            expiresAt: Date.now() + (RETENTION_DAYS * MS_PER_DAY),
        };

        await invoke('move_to_trash', {
            projectPath,
            itemId,
            itemType,
            trashMeta: JSON.stringify(trashItem)
        });

        toast.success(`"${itemName}" moved to trash`, {
            description: `Will be permanently deleted in ${RETENTION_DAYS} days`,
            action: {
                label: 'Undo',
                onClick: () => restoreFromTrash(projectPath, itemId, itemType)
            }
        });
    } catch (error) {
        console.error('Failed to move to trash:', error);
        toast.error('Failed to delete item');
        throw error;
    }
}

/**
 * Restore an item from trash
 */
export async function restoreFromTrash(
    projectPath: string,
    itemId: string,
    itemType: TrashItem['type']
): Promise<void> {
    try {
        await invoke('restore_from_trash', {
            projectPath,
            itemId,
            itemType
        });

        toast.success('Item restored');
    } catch (error) {
        console.error('Failed to restore from trash:', error);
        toast.error('Failed to restore item');
        throw error;
    }
}

/**
 * Get all items in trash for a project
 */
export async function getTrashItems(projectPath: string): Promise<TrashItem[]> {
    try {
        const items = await invoke<TrashItem[]>('list_trash', { projectPath });
        return items.filter(item => item.expiresAt > Date.now());
    } catch (error) {
        console.error('Failed to list trash:', error);
        return [];
    }
}

/**
 * Permanently delete an item from trash
 */
export async function permanentlyDelete(
    projectPath: string,
    itemId: string,
    itemType: TrashItem['type']
): Promise<void> {
    try {
        await invoke('permanent_delete', {
            projectPath,
            itemId,
            itemType
        });

        toast.success('Permanently deleted');
    } catch (error) {
        console.error('Failed to permanently delete:', error);
        toast.error('Failed to delete item');
        throw error;
    }
}

/**
 * Empty all items in trash
 */
export async function emptyTrash(projectPath: string): Promise<void> {
    try {
        await invoke('empty_trash', { projectPath });
        toast.success('Trash emptied');
    } catch (error) {
        console.error('Failed to empty trash:', error);
        toast.error('Failed to empty trash');
        throw error;
    }
}
