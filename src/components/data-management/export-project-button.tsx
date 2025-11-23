'use client';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import { useImportExport } from '@/hooks/use-import-export';

interface ExportProjectButtonProps {
    projectId: string;
    onExportStart?: () => void;
}

export function ExportProjectButton({ projectId, onExportStart }: ExportProjectButtonProps) {
    const { exportProject } = useImportExport();

    const handleExport = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (onExportStart) onExportStart();

        await exportProject(projectId);
    };

    return (
        <DropdownMenuItem onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Project JSON
        </DropdownMenuItem>
    );
}
