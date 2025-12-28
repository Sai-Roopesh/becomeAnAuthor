import type { ExportPreset } from '@/domain/types/export-types';

/**
 * Built-in Export Presets
 * 
 * Professional manuscript formatting templates for common publishing scenarios.
 */

export const BUILT_IN_PRESETS: ExportPreset[] = [
    // 1. Industry Standard Manuscript
    {
        id: 'industry-standard',
        type: 'industry-standard',
        name: 'Industry Standard Manuscript',
        description: 'Traditional agent/publisher submission format with Courier, double-spacing, and proper headers',
        defaultFormat: 'docx',
        supportedFormats: ['docx', 'pdf'],
        config: {
            // Typography - Industry standard
            fontFamily: 'Courier New',
            fontSize: 12,
            lineHeight: 2.0,
            alignment: 'left',

            // Layout - US Letter, 1-inch margins
            pageSize: {
                name: 'Letter',
                width: 215.9,  // mm
                height: 279.4,
            },
            margins: {
                top: 25.4,     // 1 inch in mm
                right: 25.4,
                bottom: 25.4,
                left: 25.4,
            },

            // Content formatting
            includeCoverPage: true,
            includePageNumbers: true,
            includeTOC: false,
            sceneBreakStyle: 'centered-hash', // #
            chapterBreakStyle: 'new-page',

            // Front matter
            frontMatter: {
                titlePage: true,
                copyright: '© {{year}} {{author}}. All rights reserved.',
                tableOfContents: false,
            },
        },
    },

    // 2. Query Package
    {
        id: 'query-package',
        type: 'query-package',
        name: 'Query Package',
        description: 'Synopsis, author bio, and first 3 chapters for agent queries',
        defaultFormat: 'docx',
        supportedFormats: ['docx', 'pdf'],
        config: {
            fontFamily: 'Times New Roman',
            fontSize: 12,
            lineHeight: 2.0,
            alignment: 'left',

            pageSize: {
                name: 'Letter',
                width: 215.9,
                height: 279.4,
            },
            margins: {
                top: 25.4,
                right: 25.4,
                bottom: 25.4,
                left: 25.4,
            },

            includeCoverPage: true,
            includePageNumbers: true,
            includeTOC: true,
            sceneBreakStyle: 'blank-line',
            chapterBreakStyle: 'new-page',

            frontMatter: {
                titlePage: true,
                tableOfContents: true,
            },

            backMatter: {
                authorBio: 'Replace with your author bio (100-200 words)',
                contactInfo: 'email@example.com',
            },
        },
    },

    // 3. Beta Reader
    {
        id: 'beta-reader',
        type: 'beta-reader',
        name: 'Beta Reader',
        description: 'Clean, readable format optimized for feedback collection',
        defaultFormat: 'pdf',
        supportedFormats: ['pdf', 'epub', 'docx'],
        config: {
            fontFamily: 'Georgia',
            fontSize: 11,
            lineHeight: 1.6,
            alignment: 'left',

            pageSize: {
                name: 'A4',
                width: 210,
                height: 297,
            },
            margins: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
            },

            includeCoverPage: true,
            includePageNumbers: true,
            includeTOC: true,
            sceneBreakStyle: 'asterisks', // ***
            chapterBreakStyle: 'new-page',

            frontMatter: {
                titlePage: true,
                tableOfContents: true,
            },

            backMatter: {
                acknowledgments: 'Thank you for reading! Your feedback is valuable.',
            },
        },
    },

    // 4. Self-Publish eBook
    {
        id: 'self-publish-ebook',
        type: 'self-publish-ebook',
        name: 'Self-Publish eBook',
        description: 'ePub format for KDP, IngramSpark, and other platforms',
        defaultFormat: 'epub',
        supportedFormats: ['epub'],
        config: {
            fontFamily: 'Georgia',
            fontSize: 11,
            lineHeight: 1.6,
            alignment: 'justify',

            // ePub doesn't use page sizes like print
            includeTOC: true,
            sceneBreakStyle: 'centered-hash',
            chapterBreakStyle: 'new-page',

            frontMatter: {
                titlePage: true,
                copyright: '© {{year}} {{author}}. All rights reserved.',
                tableOfContents: true,
            },

            backMatter: {
                authorBio: 'Replace with your author bio',
                alsoBy: [],
            },

            // ePub-specific settings
            epubCSSTheme: 'classic',
            epubMetadata: {
                language: 'en',
                publisher: 'Self-Published',
                publicationDate: '{{date}}',
            },
        },
    },

    // 5. Print-Ready PDF (6x9)
    {
        id: 'print-ready-6x9',
        type: 'print-ready-pdf',
        name: 'Print-Ready PDF (6×9)',
        description: 'Professional print format with trim marks and bleeds for POD services',
        defaultFormat: 'pdf',
        supportedFormats: ['pdf'],
        config: {
            fontFamily: 'Garamond',
            fontSize: 11,
            lineHeight: 1.5,
            alignment: 'justify',

            // Print-specific dimensions
            trimSize: {
                width: 6,      // inches
                height: 9,
            },
            bleed: 3.175,      // 0.125 inch in mm

            margins: {
                top: 19,       // ~0.75 inch
                right: 16,     // ~0.625 inch
                bottom: 19,
                left: 22,      // ~0.875 inch (gutter margin larger)
            },

            includeCoverPage: false,  // Cover is separate for print
            includePageNumbers: true,
            includeTOC: true,
            sceneBreakStyle: 'blank-line',
            chapterBreakStyle: 'new-page',

            frontMatter: {
                titlePage: true,
                copyright: '© {{year}} {{author}}\\n\\nAll rights reserved.\\n\\nISBN: _______________',
                tableOfContents: true,
            },
        },
    },
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): ExportPreset | undefined {
    return BUILT_IN_PRESETS.find(preset => preset.id === id);
}

/**
 * Get presets by format
 */
export function getPresetsByFormat(format: import('@/domain/types/export-types').ExportFormat): ExportPreset[] {
    return BUILT_IN_PRESETS.filter(preset => preset.supportedFormats.includes(format));
}

/**
 * Get all preset IDs
 */
export function getPresetIds(): string[] {
    return BUILT_IN_PRESETS.map(preset => preset.id);
}
