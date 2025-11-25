/**
 * Export options for document generation
 */
export interface ExportOptions {
    /** Include table of contents */
    includeTOC?: boolean;
    /** Include scene summaries */
    includeSummaries?: boolean;
    /** Include word count statistics */
    includeStats?: boolean;
    /** Title for the exported document */
    title?: string;
    /** Author name */
    author?: string;
}

/**
 * Export Service Interface
 * Handles document export in multiple formats
 */
export interface IExportService {
    /**
     * Export project to PDF format
     * Generates a formatted PDF document with all scenes
     */
    exportToPDF(projectId: string, options?: ExportOptions): Promise<Blob>;

    /**
     * Export project to DOCX format
     * Generates a Microsoft Word document
     */
    exportToDOCX(projectId: string, options?: ExportOptions): Promise<Blob>;

    /**
     * Export project to Markdown format
     * Generates plain markdown text
     */
    exportToMarkdown(projectId: string, options?: ExportOptions): Promise<string>;
}
