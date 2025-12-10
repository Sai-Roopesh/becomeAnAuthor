'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Clock, HardDrive } from 'lucide-react';
import { useGoogleDrive } from '@/features/google-drive/hooks/use-google-drive';
import { useGoogleAuth } from '@/features/google-drive/hooks/use-google-auth';
import { useImportExport } from '@/hooks/use-import-export';
import { DriveFile } from '@/lib/config/types';
import { toast } from '@/shared/utils/toast-service';

interface DriveBackupBrowserProps {
    onRestore: (fileId: string) => void;
}

export function DriveBackupBrowser({ onRestore }: DriveBackupBrowserProps) {
    const { listBackups, deleteBackup } = useGoogleDrive();
    const { restoreFromGoogleDrive } = useImportExport();
    const { isAuthenticated } = useGoogleAuth();
    const [backups, setBackups] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState<string | null>(null);

    useEffect(() => {
        // Only load backups if authenticated
        if (isAuthenticated) {
            loadBackups();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const loadBackups = async () => {
        try {
            setIsLoading(true);
            const files = await listBackups();
            setBackups(files);
        } catch (error) {
            console.error('Failed to load backups:', error);
            toast.error('Failed to load backups from Google Drive');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (fileId: string) => {
        try {
            setIsRestoring(fileId);
            await restoreFromGoogleDrive(fileId);
            onRestore(fileId);
        } catch (error) {
            console.error('Restore failed:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to restore backup');
        } finally {
            setIsRestoring(null);
        }
    };

    const handleDelete = async (fileId: string, fileName: string) => {
        if (!confirm(`Delete backup "${fileName}"? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteBackup(fileId);
            toast.success('Backup deleted');
            loadBackups(); // Refresh list
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete backup');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatSize = (bytes: number) => {
        const kb = bytes / 1024;
        const mb = kb / 1024;
        if (mb >= 1) return `${mb.toFixed(1)} MB`;
        return `${kb.toFixed(0)} KB`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (backups.length === 0) {
        return (
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <HardDrive className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-medium">No Backups Found</h3>
                    <p className="text-sm text-muted-foreground">
                        You haven't created any Google Drive backups yet.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {backups.length} backup{backups.length !== 1 ? 's' : ''} found
                </p>
                <Button variant="ghost" size="sm" onClick={loadBackups}>
                    Refresh
                </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {backups.map((backup) => (
                    <div
                        key={backup.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                    <h4 className="font-medium truncate">{backup.name}</h4>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(backup.modifiedTime)}
                                    </span>
                                    <span>{formatSize(backup.size)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleRestore(backup.id)}
                                    disabled={isRestoring === backup.id}
                                >
                                    {isRestoring === backup.id ? 'Restoring...' : 'Restore'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(backup.id, backup.name)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
