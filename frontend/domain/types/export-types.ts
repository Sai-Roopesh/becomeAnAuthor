/**
 * Export Domain Types
 * 
 * Type definitions for the dynamic export system with template presets,
 * live preview, and multi-format support.
 */

export type ExportFormat = 'docx' | 'pdf' | 'epub' | 'markdown';

export type ExportPresetType =
    | 'industry-standard'
    | 'query-package'
    | 'beta-reader'
    | 'self-publish-ebook'
    | 'print-ready-pdf';

/**
 * Export preset configuration
 * Defines a complete export template with formatting and content options
 */
export interface ExportPreset {
    id: string;
    type: ExportPresetType;
    name: string;
    description: string;
    defaultFormat: ExportFormat;
    supportedFormats: ExportFormat[];
    config: ExportConfig;
}

/**
 * Complete export configuration
 * Can be used standalone or merged with preset config
 */
export interface ExportConfig {
    // Typography
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    alignment?: 'left' | 'center' | 'right' | 'justify';

    // Layout
    pageSize?: PageSize;
    margins?: Margins;
    trimSize?: TrimSize;  // For print
    bleed?: number;       // For print (mm)

    // Content
    includeTOC?: boolean;
    includeCoverPage?: boolean;
    includePageNumbers?: boolean;
    sceneBreakStyle?: 'centered-hash' | 'blank-line' | 'asterisks';
    chapterBreakStyle?: 'new-page' | 'same-page';

    // Front/Back Matter
    frontMatter?: FrontMatterConfig;
    backMatter?: BackMatterConfig;

    // ePub specific
    epubCSSTheme?: string;
    epubMetadata?: EpubMetadata;
}

/**
 * Front matter configuration
 * Content that appears before the main text
 */
export interface FrontMatterConfig {
    titlePage?: boolean;
    dedication?: string;
    epigraph?: string;
    copyright?: string;
    tableOfContents?: boolean;
}

/**
 * Back matter configuration
 * Content that appears after the main text
 */
export interface BackMatterConfig {
    authorBio?: string;
    acknowledgments?: string;
    alsoBy?: string[];
    contactInfo?: string;
}

/**
 * Page size definition
 */
export interface PageSize {
    width: number;  // mm
    height: number; // mm
    name: 'A4' | 'Letter' | '5.5x8.5' | '6x9' | 'Custom';
}

/**
 * Page margins
 */
export interface Margins {
    top: number;    // mm
    right: number;  // mm
    bottom: number; // mm
    left: number;   // mm
}

/**
 * Trim size for print formatting
 */
export interface TrimSize {
    width: number;  // inches
    height: number; // inches
}

/**
 * ePub metadata
 */
export interface EpubMetadata {
    title?: string;
    author?: string;
    language?: string;
    publisher?: string;
    publicationDate?: string;
    isbn?: string;
    cover?: string; // path to cover image
}

/**
 * Export state for UI management
 */
export interface ExportState {
    format: ExportFormat;
    preset: ExportPreset;
    customConfig?: Partial<ExportConfig>;
    previewPages?: PreviewPage[];
    isGenerating: boolean;
}

/**
 * Preview page representation
 * Used for live preview rendering
 */
export interface PreviewPage {
    pageNumber: number;
    content: string; // HTML representation
    width?: number;  // px
    height?: number; // px
}

/**
 * Template variable for front/back matter
 */
export type TemplateVariable = {
    key: string;
    label: string;
    placeholder: string;
    value?: string;
};

/**
 * Available template variables
 */
export const TEMPLATE_VARIABLES: Record<string, TemplateVariable> = {
    title: {
        key: '{{title}}',
        label: 'Project Title',
        placeholder: 'My Novel',
    },
    author: {
        key: '{{author}}',
        label: 'Author Name',
        placeholder: 'John Doe',
    },
    year: {
        key: '{{year}}',
        label: 'Current Year',
        placeholder: new Date().getFullYear().toString(),
    },
    date: {
        key: '{{date}}',
        label: 'Current Date',
        placeholder: new Date().toLocaleDateString(),
    },
    wordCount: {
        key: '{{wordCount}}',
        label: 'Total Word Count',
        placeholder: '0',
    },
};
