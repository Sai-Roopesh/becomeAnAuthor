/**
 * Type guard utilities for runtime type checking
 * Provides type-safe assertions and narrowing for Node types
 */

import type { DocumentNode } from '@/domain/entities/types';

// ============================================================================
// Type Predicates (Type Guards)
// ============================================================================

/**
 * Type guard to check if a node is a Scene
 */
export function isScene(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'scene' }> {
    return node?.type === 'scene';
}

/**
 * Type guard to check if a node is a Chapter
 */
export function isChapter(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'chapter' }> {
    return node?.type === 'chapter';
}

/**
 * Type guard to check if a node is an Act
 */
export function isAct(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'act' }> {
    return node?.type === 'act';
}

/**
 * Type guard to check if a node is a Beat
 * Note: Beat type doesn't exist in DocumentNode (only act/chapter/scene)
 */
// export function isBeat(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'beat' }> {
//     return node?.type === 'beat';
// }

/**
 * Type guard to check if a node is a Part
 * Note: Part type doesn't exist in DocumentNode (only act/chapter/scene)
 */
// export function isPart(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'part' }> {
//     return node?.type === 'part';
// }

/**
 * Type guard to check if a node is a Book
 * Note: Book type doesn't exist in DocumentNode (only act/chapter/scene)
 */
// export function isBook(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'book' }> {
//     return node?.type === 'book';
// }

// ============================================================================
// Assertion Functions (Throw on failure)
// ============================================================================

/**
 * Assert that a node is a Scene, throws if not
 * @throws {TypeError} if node is not a Scene
 */
export function assertScene(node: DocumentNode | null | undefined, message?: string): asserts node is Extract<DocumentNode, { type: 'scene' }> {
    if (!isScene(node)) {
        throw new TypeError(message || `Expected Scene but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is a Chapter, throws if not
 * @throws {TypeError} if node is not a Chapter
 */
export function assertChapter(node: DocumentNode | null | undefined, message?: string): asserts node is Extract<DocumentNode, { type: 'chapter' }> {
    if (!isChapter(node)) {
        throw new TypeError(message || `Expected Chapter but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is an Act, throws if not
 * @throws {TypeError} if node is not an Act
 */
export function assertAct(node: DocumentNode | null | undefined, message?: string): asserts node is Extract<DocumentNode, { type: 'act' }> {
    if (!isAct(node)) {
        throw new TypeError(message || `Expected Act but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is a Beat, throws if not
 * @throws {TypeError} if node is not a Beat  
 * Note: Beat type doesn't exist in DocumentNode
 */
// export function assertBeat(node: DocumentNode | null | undefined, message?: string): asserts node is Extract<DocumentNode, { type: 'beat' }> {
//     if (!isBeat(node)) {
//         throw new TypeError(message || `Expected Beat but got ${node?.type || 'null/undefined'}`);
//     }
// }

/**
 * Assert that a node is a Part, throws if not
 * @throws {TypeError} if node is not a Part
 * Note: Part type doesn't exist in DocumentNode
 */
// export function assertPart(node: DocumentNode | null | undefined, message?: string): asserts node is Extract<DocumentNode, { type: 'part' }> {
//     if (!isPart(node)) {
//         throw new TypeError(message || `Expected Part but got ${node?.type || 'null/undefined'}`);
//     }
// }

/**
 * Assert that a node is a Book, throws if not
 * @throws {TypeError} if node is not a Book
 * Note: Book type doesn't exist in DocumentNode
 */
// export function assertBook(node: DocumentNode | null | undefined, message?: string): asserts node is Extract<DocumentNode, { type: 'book' }> {
//     if (!isBook(node)) {
//         throw new TypeError(message || `Expected Book but got ${node?.type || 'null/undefined'}`);
//     }
// }

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard to check if a node has content (Scene only for DocumentNode)
 */
export function hasContent(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'scene' }> {
    return isScene(node);
}

/**
 * Type guard to check if a node is a container (Chapter, Act only for DocumentNode)
 */
export function isContainer(node: DocumentNode | null | undefined): node is Extract<DocumentNode, { type: 'chapter' | 'act' }> {
    return isChapter(node) || isAct(node);
}

/**
 * Type guard to check if a node can have children
 */
export function canHaveChildren(node: DocumentNode | null | undefined): boolean {
    return isContainer(node);
}

// ============================================================================
// Safe Access Helpers
// ============================================================================

/**
 * Safely get scene content, returns null if not a scene
 */
export function getSceneContent(node: DocumentNode | null | undefined): string | null {
    return isScene(node) ? node.content : null;
}

/**
 * Safely get beat content, returns null if not a beat
 * Note: Beat type doesn't exist in DocumentNode
 */
// export function getBeatContent(node: DocumentNode | null | undefined): string | null {
//     return isBeat(node) ? node.content : null;
// }

/**
 * Safely get any content (scene only for DocumentNode), returns null if no content
 */
export function getAnyContent(node: DocumentNode | null | undefined): string | null {
    if (isScene(node)) return node.content;
    return null;
}
