/**
 * Tiptap Content Type Definitions
 * Based on ProseMirror schema used by Tiptap
 */

/**
 * Represents a mark (inline formatting) in Tiptap content
 * Note: attrs uses `any` for compatibility with Tiptap's JSONContent type
 */
export interface TiptapMark {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attrs?: Record<string, any>;
}

/**
 * Represents a text node in Tiptap content
 */
export interface TiptapTextNode {
    type: 'text';
    text: string;
    marks?: TiptapMark[];
}

/**
 * Represents an element node (block or inline) in Tiptap content
 * Note: attrs uses `any` for compatibility with Tiptap's JSONContent type
 */
export interface TiptapElementNode {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attrs?: Record<string, any>;
    content?: TiptapNode[];
    marks?: TiptapMark[];
    text?: string;
}

/**
 * Union type for all possible Tiptap nodes
 */
export type TiptapNode = TiptapTextNode | TiptapElementNode;

/**
 * Represents the root document structure
 */
export interface TiptapContent {
    type: 'doc';
    content?: TiptapNode[];
}

/**
 * Represents the JSON output from editor.getJSON()
 */
export type TiptapJSON = TiptapContent;

/**
 * Type guard to check if content is valid Tiptap JSON
 */
export function isTiptapContent(content: unknown): content is TiptapContent {
    return (
        typeof content === 'object' &&
        content !== null &&
        'type' in content &&
        content.type === 'doc'
    );
}

/**
 * Type guard to check if a node is a text node
 */
export function isTextNode(node: TiptapNode): node is TiptapTextNode {
    return node.type === 'text';
}

/**
 * Type guard to check if a node is an element node
 */
export function isElementNode(node: TiptapNode): node is TiptapElementNode {
    return node.type !== 'text';
}
