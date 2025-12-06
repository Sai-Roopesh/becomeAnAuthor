/**
 * Document Export Hook (Tauri Version)
 * 
 * Uses Tauri's export_manuscript_text command for exporting manuscripts.
 * 
 * TODO: Implement full DOCX export with formatting using Tauri
 */
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/lib/toast-service';
import { getCurrentProjectPath } from '@/infrastructure/repositories/TauriNodeRepository';

export function useDocumentExport() {

    const exportProjectAsDocx = async (projectId: string) => {
        try {
            const projectPath = getCurrentProjectPath();
            if (!projectPath) throw new Error('No project selected');

            // Use Tauri's built-in text export (DOCX support coming later)
            const textContent = await invoke<string>('export_manuscript_text', {
                projectPath
            });

            // Download as plain text for now
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `manuscript-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Manuscript exported as text. DOCX export coming soon.');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export manuscript');
        }
    };

    return { exportProjectAsDocx };
}
