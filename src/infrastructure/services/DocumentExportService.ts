import type { IExportService, ExportOptions } from '@/domain/services/IExportService';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { Scene } from '@/lib/config/types';
import { extractTextFromContent } from '@/lib/utils/editor';

/**
 * Document Export Service
 * Handles export to various formats (PDF, DOCX, Markdown)
 * 
 * Note: For now, this provides a foundation for export functionality.
 * PDF and DOCX generation would require additional libraries like:
 * - jsPDF or pdfmake for PDF
 * - docx for DOCX generation
 */
export class DocumentExportService implements IExportService {
    constructor(private nodeRepository: INodeRepository) { }

    /**
     * Export to PDF
     * Currently returns a placeholder - would need PDF library integration
     */
    async exportToPDF(projectId: string, options?: ExportOptions): Promise<Blob> {
        const markdown = await this.exportToMarkdown(projectId, options);

        // TODO: Integrate PDF generation library (jsPDF, pdfmake, etc.)
        // For now, return markdown as text blob
        return new Blob([markdown], { type: 'text/plain' });
    }

    /**
     * Export to DOCX
     * Currently returns a placeholder - would need DOCX library integration
     */
    async exportToDOCX(projectId: string, options?: ExportOptions): Promise<Blob> {
        const markdown = await this.exportToMarkdown(projectId, options);

        // TODO: Integrate DOCX generation library (docx package)
        // For now, return markdown as text blob
        return new Blob([markdown], { type: 'text/plain' });
    }

    /**
     * Export to Markdown
     * Fully implemented - generates markdown formatted document
     */
    async exportToMarkdown(projectId: string, options?: ExportOptions): Promise<string> {
        const nodes = await this.nodeRepository.getByProject(projectId);
        const scenes = nodes.filter(n => n.type === 'scene') as Scene[];

        const parts: string[] = [];

        // Title and metadata
        if (options?.title) {
            parts.push(`# ${options.title}\n`);
        }
        if (options?.author) {
            parts.push(`**By ${options.author}**\n`);
        }

        // Table of contents
        if (options?.includeTOC) {
            parts.push('## Table of Contents\n');
            const acts = nodes.filter(n => n.type === 'act');
            acts.forEach(act => {
                parts.push(`- ${act.title}`);
                const chapters = nodes.filter(n => n.parentId === act.id && n.type === 'chapter');
                chapters.forEach(chapter => {
                    parts.push(`  - ${chapter.title}`);
                    const chapterScenes = nodes.filter(n => n.parentId === chapter.id && n.type === 'scene');
                    chapterScenes.forEach(scene => {
                        parts.push(`    - ${scene.title}`);
                    });
                });
            });
            parts.push('\n---\n');
        }

        // Statistics
        if (options?.includeStats) {
            const totalWords = scenes.reduce((sum, scene) => {
                const text = extractTextFromContent(scene.content);
                return sum + text.split(/\s+/).filter(w => w.length > 0).length;
            }, 0);
            parts.push(`**Total Word Count:** ${totalWords.toLocaleString()} words\n`);
            parts.push(`**Total Scenes:** ${scenes.length}\n\n---\n`);
        }

        // Content
        const acts = nodes.filter(n => n.type === 'act');
        acts.forEach(act => {
            parts.push(`\n# ${act.title}\n`);

            const chapters = nodes.filter(n => n.parentId === act.id && n.type === 'chapter');
            chapters.forEach(chapter => {
                parts.push(`\n## ${chapter.title}\n`);

                const chapterScenes = scenes.filter(n => n.parentId === chapter.id);
                chapterScenes.forEach(scene => {
                    parts.push(`\n### ${scene.title}\n`);

                    if (options?.includeSummaries && scene.summary) {
                        parts.push(`> ${scene.summary}\n`);
                    }

                    const sceneText = extractTextFromContent(scene.content);
                    parts.push(`${sceneText}\n`);
                });
            });
        });

        return parts.join('\n');
    }
}
