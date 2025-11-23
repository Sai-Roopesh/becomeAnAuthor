'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Database, Download, FileJson, Upload } from 'lucide-react';
import { useImportExport } from '@/hooks/use-import-export';
import { useRef } from 'react';

export function DataManagementMenu() {
    const { exportFullBackup, importFullBackup, importProject } = useImportExport();
    const backupInputRef = useRef<HTMLInputElement>(null);
    const projectInputRef = useRef<HTMLInputElement>(null);

    const handleBackupRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (confirm('WARNING: Restoring a backup will OVERWRITE all current data. This cannot be undone. Are you sure?')) {
                importFullBackup(file);
            }
        }
        // Reset input
        if (backupInputRef.current) backupInputRef.current.value = '';
    };

    const handleProjectImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const newProjectId = await importProject(file);
                if (newProjectId) {
                    window.location.reload(); // Reload to show new project
                }
            } catch (error) {
                // Error handled in hook
            }
        }
        // Reset input
        if (projectInputRef.current) projectInputRef.current.value = '';
    };

    return (
        <>
            <input
                type="file"
                ref={backupInputRef}
                className="hidden"
                accept=".json"
                onChange={handleBackupRestore}
            />
            <input
                type="file"
                ref={projectInputRef}
                className="hidden"
                accept=".json"
                onChange={handleProjectImport}
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Database className="h-4 w-4" />
                        Data
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => projectInputRef.current?.click()}>
                        <FileJson className="h-4 w-4 mr-2" />
                        Import Project JSON
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuLabel>Database Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportFullBackup}>
                        <Download className="h-4 w-4 mr-2" />
                        Backup Full Database
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => backupInputRef.current?.click()} className="text-destructive focus:text-destructive">
                        <Upload className="h-4 w-4 mr-2" />
                        Restore Database
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
