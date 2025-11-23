import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download, FileText } from 'lucide-react';
import { useImportExport } from '@/hooks/use-import-export';
import { useDocumentExport } from '@/hooks/use-document-export';

interface ExportProjectButtonProps {
    projectId: string;
    onExportStart?: () => void;
}

export function ExportProjectButton({ projectId, onExportStart }: ExportProjectButtonProps) {
    const { exportProject } = useImportExport();
    const { exportProjectAsDocx } = useDocumentExport();

    const handleJsonExport = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onExportStart) onExportStart();
        await exportProject(projectId);
    };

    const handleDocxExport = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onExportStart) onExportStart();
        await exportProjectAsDocx(projectId);
    };

    return (
        <>
            <DropdownMenuItem onClick={handleJsonExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Project JSON (Backup)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDocxExport}>
                <FileText className="h-4 w-4 mr-2" />
                Export Manuscript DOCX
            </DropdownMenuItem>
        </>
    );
}
