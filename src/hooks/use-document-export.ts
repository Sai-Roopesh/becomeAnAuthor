import { db } from '@/lib/core/database';
import { toast } from '@/lib/toast-service';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { useFormatStore } from '@/store/use-format-store';
import { extractTextFromTiptapJSON } from '@/lib/utils/editor';

export function useDocumentExport() {
    const formatSettings = useFormatStore();

    const exportProjectAsDocx = async (projectId: string) => {
        try {
            const project = await db.projects.get(projectId);
            if (!project) throw new Error('Project not found');

            const nodes = await db.nodes.where('projectId').equals(projectId).sortBy('order');

            // Build Tree
            const acts = nodes.filter(n => n.type === 'act');
            const chapters = nodes.filter(n => n.type === 'chapter');
            const scenes = nodes.filter(n => n.type === 'scene');

            const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);

            const docChildren: (Paragraph | PageBreak)[] = [];

            // Title Page
            docChildren.push(
                new Paragraph({
                    text: project.title,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),
                new Paragraph({
                    text: `by ${project.author || 'Unknown Author'}`,
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 4000 }, // Big gap
                }),
                new PageBreak()
            );

            // Helper to add scene content
            const addSceneContent = (scene: any) => {
                const text = extractTextFromTiptapJSON(scene.content);
                const paragraphs = text.split('\n').filter(p => p.trim() !== '');

                paragraphs.forEach(p => {
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: p,
                                    font: formatSettings.fontFamily,
                                    size: formatSettings.fontSize * 2, // docx uses half-points
                                }),
                            ],
                            spacing: {
                                line: formatSettings.lineHeight * 240, // 240 = 100%
                                after: formatSettings.paragraphSpacing * 200, // approx
                            },
                            indent: {
                                firstLine: formatSettings.textIndent * 20, // twips
                            },
                            alignment: formatSettings.alignment === 'justify' ? AlignmentType.JUSTIFIED :
                                formatSettings.alignment === 'center' ? AlignmentType.CENTER :
                                    formatSettings.alignment === 'right' ? AlignmentType.RIGHT :
                                        AlignmentType.LEFT,
                        })
                    );
                });

                // Scene Divider
                docChildren.push(
                    new Paragraph({
                        text: formatSettings.sceneDividerStyle || '***',
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 400 },
                    })
                );
            };

            // Traverse Tree
            // If no acts/chapters, just dump scenes (flat structure)
            if (acts.length === 0 && chapters.length === 0) {
                scenes.forEach(scene => addSceneContent(scene));
            } else {
                // Hierarchical structure
                const rootNodes = nodes.filter(n => !n.parentId);

                const processNode = (node: any) => {
                    if (node.type === 'act') {
                        docChildren.push(
                            new PageBreak(),
                            new Paragraph({
                                text: node.title,
                                heading: HeadingLevel.HEADING_1,
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 400 },
                            })
                        );
                        getChildren(node.id).forEach(processNode);
                    } else if (node.type === 'chapter') {
                        docChildren.push(
                            new PageBreak(),
                            new Paragraph({
                                text: node.title,
                                heading: HeadingLevel.HEADING_2,
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 400 },
                            })
                        );
                        getChildren(node.id).forEach(processNode);
                    } else if (node.type === 'scene') {
                        addSceneContent(node);
                    }
                };

                rootNodes.forEach(processNode);
            }

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: docChildren as any,
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
            a.click();
            toast.success('Manuscript exported as DOCX');

        } catch (error) {
            console.error('DOCX export failed:', error);
            toast.error('Failed to export DOCX');
        }
    };

    return { exportProjectAsDocx };
}
