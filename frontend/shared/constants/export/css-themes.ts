/**
 * CSS Themes for ePub Exports
 * 
 * Predefined styles for eBook formatting across different genres and aesthetics.
 */

export interface CSSTheme {
    id: string;
    name: string;
    description: string;
    css: string;
}

/**
 * Classic eBook Theme
 * Traditional serif fonts with comfortable reading spacing
 */
const CLASSIC_THEME: CSSTheme = {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional serif fonts, perfect for literary fiction',
    css: `
        body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 1em;
            line-height: 1.6;
            text-align: justify;
            margin: 0;
            padding: 1.5em;
            color: #2a2a2a;
        }
        
        h1 {
            font-size: 2em;
            margin: 1.5em 0 1em 0;
            text-align: center;
            page-break-before: always;
            font-weight: bold;
        }
        
        h2 {
            font-size: 1.5em;
            margin: 1.2em 0 0.8em 0;
            font-weight: bold;
        }
        
        h3 {
            font-size: 1.2em;
            margin: 1em 0 0.6em 0;
            font-weight: bold;
        }
        
        p {
            margin: 0 0 0.5em 0;
            text-indent: 1.5em;
        }
        
        p:first-of-type,
        p.no-indent {
            text-indent: 0;
        }
        
        .scene-break {
            text-align: center;
            margin: 1.5em 0;
            font-size: 1.2em;
        }
        
        blockquote {
            margin: 1em 2em;
            font-style: italic;
        }
    `,
};

/**
 * Modern eBook Theme
 * Clean sans-serif with increased spacing
 */
const MODERN_THEME: CSSTheme = {
    id: 'modern',
    name: 'Modern',
    description: 'Clean sans-serif fonts, ideal for contemporary fiction',
    css: `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 1em;
            line-height: 1.7;
            text-align: left;
            margin: 0;
            padding: 1.2em;
            color: #1a1a1a;
        }
        
        h1 {
            font-size: 2.2em;
            margin: 2em 0 1em 0;
            text-align: left;
            page-break-before: always;
            font-weight: 700;
            letter-spacing: -0.02em;
        }
        
        h2 {
            font-size: 1.6em;
            margin: 1.5em 0 0.8em 0;
            font-weight: 600;
        }
        
        h3 {
            font-size: 1.3em;
            margin: 1.2em 0 0.6em 0;
            font-weight: 600;
        }
        
        p {
            margin: 0 0 1em 0;
            text-indent: 0;
        }
        
        .scene-break {
            text-align: center;
            margin: 2em 0;
            font-size: 1em;
            letter-spacing: 0.5em;
        }
        
        blockquote {
            margin: 1.5em 1em;
            padding-left: 1em;
            border-left: 3px solid #ccc;
            font-style: italic;
        }
    `,
};

/**
 * Minimalist eBook Theme
 * Maximum readability with minimal distractions
 */
const MINIMALIST_THEME: CSSTheme = {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Maximum readability, minimal distractions',
    css: `
        body {
            font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
            font-size: 1em;
            line-height: 1.8;
            text-align: left;
            margin: 0;
            padding: 2em 1.5em;
            color: #333;
        }
        
        h1 {
            font-size: 1.8em;
            margin: 2em 0 1.5em 0;
            text-align: left;
            page-break-before: always;
            font-weight: normal;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        
        h2 {
            font-size: 1.3em;
            margin: 1.5em 0 1em 0;
            font-weight: normal;
        }
        
        h3 {
            font-size: 1.1em;
            margin: 1.2em 0 0.8em 0;
            font-weight: normal;
            font-style: italic;
        }
        
        p {
            margin: 0 0 0.8em 0;
            text-indent: 0;
        }
        
        .scene-break {
            text-align: center;
            margin: 2em 0;
            font-size: 0.8em;
        }
        
        blockquote {
            margin: 1em 0;
            font-style: italic;
            opacity: 0.8;
        }
    `,
};

/**
 * Fantasy eBook Theme
 * Decorative fonts with rich styling for fantasy/medieval settings
 */
const FANTASY_THEME: CSSTheme = {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Decorative styling perfect for fantasy and medieval stories',
    css: `
        body {
            font-family: 'Garamond', 'Georgia', serif;
            font-size: 1.05em;
            line-height: 1.7;
            text-align: justify;
            margin: 0;
            padding: 1.5em;
            color: #2d2d2d;
        }
        
        h1 {
            font-size: 2.5em;
            margin: 1.5em 0 1em 0;
            text-align: center;
            page-break-before: always;
            font-weight: bold;
            font-variant: small-caps;
            letter-spacing: 0.05em;
        }
        
        h2 {
            font-size: 1.7em;
            margin: 1.3em 0 0.8em 0;
            font-weight: bold;
            font-variant: small-caps;
        }
        
        h3 {
            font-size: 1.3em;
            margin: 1em 0 0.6em 0;
            font-weight: bold;
        }
        
        p {
            margin: 0 0 0.6em 0;
            text-indent: 1.8em;
        }
        
        p:first-of-type,
        p.no-indent {
            text-indent: 0;
        }
        
        p:first-of-type::first-letter {
            font-size: 3em;
            line-height: 0.8;
            float: left;
            margin: 0.1em 0.1em 0 0;
            font-weight: bold;
        }
        
        .scene-break {
            text-align: center;
            margin: 1.5em 0;
            font-size: 1.5em;
        }
        
        blockquote {
            margin: 1em 2em;
            font-style: italic;
            opacity: 0.9;
        }
    `,
};

/**
 * Romance eBook Theme
 * Elegant and flowing, optimized for romantic fiction
 */
const ROMANCE_THEME: CSSTheme = {
    id: 'romance',
    name: 'Romance',
    description: 'Elegant, flowing style for romantic fiction',
    css: `
        body {
            font-family: 'Baskerville', 'Georgia', serif;
            font-size: 1.05em;
            line-height: 1.75;
            text-align: justify;
            margin: 0;
            padding: 1.5em;
            color: #3a3a3a;
        }
        
        h1 {
            font-size: 2.3em;
            margin: 1.8em 0 1.2em 0;
            text-align: center;
            page-break-before: always;
            font-weight: 400;
            font-style: italic;
        }
        
        h2 {
            font-size: 1.6em;
            margin: 1.4em 0 0.9em 0;
            font-weight: 400;
            font-style: italic;
        }
        
        h3 {
            font-size: 1.3em;
            margin: 1.2em 0 0.7em 0;
            font-weight: 400;
        }
        
        p {
            margin: 0 0 0.7em 0;
            text-indent: 1.6em;
        }
        
        p:first-of-type,
        p.no-indent {
            text-indent: 0;
        }
        
        .scene-break {
            text-align: center;
            margin: 1.8em 0;
            font-size: 1.2em;
        }
        
        blockquote {
            margin: 1.2em 2em;
            font-style: italic;
            color: #555;
        }
    `,
};

/**
 * All available CSS themes
 */
export const CSS_THEMES: CSSTheme[] = [
    CLASSIC_THEME,
    MODERN_THEME,
    MINIMALIST_THEME,
    FANTASY_THEME,
    ROMANCE_THEME,
];

/**
 * Get theme by ID
 */
export function getThemeById(id: string): CSSTheme | undefined {
    return CSS_THEMES.find(theme => theme.id === id);
}

/**
 * Get theme CSS by ID, with fallback to classic
 */
export function getThemeCSS(themeId?: string): string {
    if (!themeId) {
        return CLASSIC_THEME.css;
    }

    const theme = getThemeById(themeId);
    return theme ? theme.css : CLASSIC_THEME.css;
}
