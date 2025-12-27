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
 * Handles document export in multiple formats with template support
 */
export interface IExportService {
    // ===== Existing Methods =====

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

    // ===== NEW: Template-Based Exports =====

    /**
     * Export with a preset template configuration
     * Applies preset formatting and generates output in the preset's default format
     */
    exportWithPreset(
        projectId: string,
        preset: import('@/domain/types/export-types').ExportPreset,
        customConfig?: Partial<import('@/domain/types/export-types').ExportConfig>
    ): Promise<Blob>;

    /**
     * Export project to ePub format
     * Generates an eBook file with custom CSS and metadata
     */
    exportToEpub(
        projectId: string,
        config: import('@/domain/types/export-types').ExportConfig
    ): Promise<Blob>;

    /**
     * Generate live preview pages
     * Creates HTML representations of pages for preview before export
     */
    generatePreview(
        projectId: string,
        preset: import('@/domain/types/export-types').ExportPreset,
        customConfig?: Partial<import('@/domain/types/export-types').ExportConfig>
    ): Promise<import('@/domain/types/export-types').PreviewPage[]>;

    /**
     * Get available built-in export presets
     */
    getPresets(): import('@/domain/types/export-types').ExportPreset[];
}

