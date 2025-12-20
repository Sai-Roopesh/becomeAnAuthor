import type { IExportService, ExportOptions } from '@/domain/services/IExportService';
import type { INodeRepository } from '@/domain/repositories/INodeRepository';
import type { Scene } from '@/lib/config/types';
import { extractTextFromContent } from '@/shared/utils/editor';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    PageBreak,
    AlignmentType,
} from 'docx';

/**
 * Document Export Service
 * Handles export to various formats (PDF, DOCX, Markdown)
 */
export class DocumentExportService implements IExportService {
    constructor(private nodeRepository: INodeRepository) { }

    /**
     * Export to PDF using html2pdf.js
     * Converts Markdown → HTML → PDF with professional styling
     */
    async exportToPDF(projectId: string, options?: ExportOptions): Promise<Blob> {
        // Dynamic import to avoid SSR issues
        const [{ default: html2pdf }, { marked }] = await Promise.all([
            import('html2pdf.js'),
            import('marked'),
        ]);

        // Generate markdown first
        const markdown = await this.exportToMarkdown(projectId, options);

        // Convert markdown to HTML
        const htmlContent = await marked(markdown);

        // Create styled HTML document
        const styledHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            max-width: 100%;
            margin: 0;
            padding: 40px;
            color: #333;
        }
        h1 {
            font-size: 24pt;
            margin-top: 40px;
            margin-bottom: 20px;
            page-break-before: always;
            color: #1a1a1a;
        }
        h1:first-child {
            page-break-before: avoid;
            text-align: center;
        }
        h2 {
            font-size: 18pt;
            margin-top: 30px;
            margin-bottom: 15px;
            color: #2a2a2a;
        }
        h3 {
            font-size: 14pt;
            margin-top: 20px;
            margin-bottom: 10px;
            color: #3a3a3a;
        }
        p {
            margin-bottom: 12px;
            text-align: justify;
            text-indent: 1.5em;
        }
        p:first-of-type {
            text-indent: 0;
        }
        blockquote {
            border-left: 3px solid #ccc;
            padding-left: 15px;
            margin-left: 0;
            color: #666;
            font-style: italic;
        }
        hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 30px 0;
        }
        ul, ol {
            padding-left: 25px;
        }
        li {
            margin-bottom: 5px;
        }
        strong {
            color: #000;
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

        // Create a temporary container for html2pdf
        const container = document.createElement('div');
        container.innerHTML = styledHtml;
        document.body.appendChild(container);

        try {
            const pdfBlob = await html2pdf()
                .from(container.querySelector('body') ?? container)
                .set({
                    margin: [20, 20, 20, 20], // mm: top, left, bottom, right
                    filename: `${options?.title || 'manuscript'}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        letterRendering: true,
                    },
                    jsPDF: {
                        unit: 'mm',
                        format: 'a4',
                        orientation: 'portrait',
                    },
                })
                .outputPdf('blob');

            return pdfBlob;
        } finally {
            // Clean up temporary container
            document.body.removeChild(container);
        }
    }

    /**
     * Export to DOCX (Microsoft Word format)
     * Generates a properly formatted Word document
     */
    async exportToDOCX(projectId: string, options?: ExportOptions): Promise<Blob> {
        const nodes = await this.nodeRepository.getByProject(projectId);
        const scenes = nodes.filter(n => n.type === 'scene') as Scene[];

        const children: Paragraph[] = [];

        // Title page
        if (options?.title) {
            children.push(
                new Paragraph({
                    text: options.title,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                })
            );
        }
        if (options?.author) {
            children.push(
                new Paragraph({
                    text: `By ${options.author}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 800 },
                })
            );
        }
        if (options?.title || options?.author) {
            // Page break after title page
            children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        // Table of contents (basic)
        if (options?.includeTOC) {
            children.push(
                new Paragraph({
                    text: 'Table of Contents',
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 400 },
                })
            );
            const acts = nodes.filter(n => n.type === 'act');
            for (const act of acts) {
                children.push(new Paragraph({ text: act.title, bullet: { level: 0 } }));
                const chapters = nodes.filter(n => n.parentId === act.id && n.type === 'chapter');
                for (const chapter of chapters) {
                    children.push(new Paragraph({ text: chapter.title, bullet: { level: 1 } }));
                }
            }
            children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        // Content: Acts -> Chapters -> Scenes
        const acts = nodes.filter(n => n.type === 'act');
        for (const act of acts) {
            children.push(
                new Paragraph({
                    text: act.title,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                })
            );

            const chapters = nodes.filter(n => n.parentId === act.id && n.type === 'chapter');
            for (const chapter of chapters) {
                children.push(
                    new Paragraph({
                        text: chapter.title,
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 300, after: 150 },
                    })
                );

                const chapterScenes = scenes.filter(n => n.parentId === chapter.id);
                for (const scene of chapterScenes) {
                    // Scene title
                    children.push(
                        new Paragraph({
                            text: scene.title,
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 200, after: 100 },
                        })
                    );

                    // Summary (if enabled and exists)
                    if (options?.includeSummaries && scene.summary) {
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: scene.summary,
                                        italics: true,
                                        color: '666666',
                                    }),
                                ],
                                spacing: { after: 200 },
                            })
                        );
                    }

                    // Scene content - split by paragraphs
                    const sceneText = extractTextFromContent(scene.content);
                    const paragraphs = sceneText.split(/\n\n+/).filter(p => p.trim());
                    for (const para of paragraphs) {
                        children.push(
                            new Paragraph({
                                children: [new TextRun(para.trim())],
                                spacing: { after: 200 },
                            })
                        );
                    }
                }

                // Page break between chapters
                children.push(new Paragraph({ children: [new PageBreak()] }));
            }
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children,
            }],
        });

        return await Packer.toBlob(doc);
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
