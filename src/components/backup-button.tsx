'use client';

import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { Download } from 'lucide-react';
import { toast } from '@/lib/toast-service';

export function BackupButton() {
    const handleBackup = async () => {
        try {
            const { exportDB } = await import('dexie-export-import');
            const blob = await exportDB(db);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `novel-backup-${new Date().toISOString()}.json`;
            a.click();
            toast.success('Backup created successfully');
        } catch (error) {
            console.error('Backup failed:', error);
            toast.error('Backup failed. See console for details.');
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleBackup}>
            <Download className="h-4 w-4 mr-2" /> Backup
        </Button>
    );
}
