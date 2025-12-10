/**
 * Type guard utilities for runtime type checking
 * Provides type-safe assertions and narrowing for Node types
 */

import { Node } from '@/lib/config/types';

// ============================================================================
// Type Predicates (Type Guards)
// ============================================================================

/**
 * Type guard to check if a node is a Scene
 */
export function isScene(node: Node | null | undefined): node is Extract<Node, { type: 'scene' }> {
    return node?.type === 'scene';
}

/**
 * Type guard to check if a node is a Chapter
 */
export function isChapter(node: Node | null | undefined): node is Extract<Node, { type: 'chapter' }> {
    return node?.type === 'chapter';
}

/**
 * Type guard to check if a node is an Act
 */
export function isAct(node: Node | null | undefined): node is Extract<Node, { type: 'act' }> {
    return node?.type === 'act';
}

/**
 * Type guard to check if a node is a Beat
 */
export function isBeat(node: Node | null | undefined): node is Extract<Node, { type: 'beat' }> {
    return node?.type === 'beat';
}

/**
 * Type guard to check if a node is a Part
 */
export function isPart(node: Node | null | undefined): node is Extract<Node, { type: 'part' }> {
    return node?.type === 'part';
}

/**
 * Type guard to check if a node is a Book
 */
export function isBook(node: Node | null | undefined): node is Extract<Node, { type: 'book' }> {
    return node?.type === 'book';
}

// ============================================================================
// Assertion Functions (Throw on failure)
// ============================================================================

/**
 * Assert that a node is a Scene, throws if not
 * @throws {TypeError} if node is not a Scene
 */
export function assertScene(node: Node | null | undefined, message?: string): asserts node is Extract<Node, { type: 'scene' }> {
    if (!isScene(node)) {
        throw new TypeError(message || `Expected Scene but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is a Chapter, throws if not
 * @throws {TypeError} if node is not a Chapter
 */
export function assertChapter(node: Node | null | undefined, message?: string): asserts node is Extract<Node, { type: 'chapter' }> {
    if (!isChapter(node)) {
        throw new TypeError(message || `Expected Chapter but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is an Act, throws if not
 * @throws {TypeError} if node is not an Act
 */
export function assertAct(node: Node | null | undefined, message?: string): asserts node is Extract<Node, { type: 'act' }> {
    if (!isAct(node)) {
        throw new TypeError(message || `Expected Act but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is a Beat, throws if not
 * @throws {TypeError} if node is not a Beat
 */
export function assertBeat(node: Node | null | undefined, message?: string): asserts node is Extract<Node, { type: 'beat' }> {
    if (!isBeat(node)) {
        throw new TypeError(message || `Expected Beat but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is a Part, throws if not
 * @throws {TypeError} if node is not a Part
 */
export function assertPart(node: Node | null | undefined, message?: string): asserts node is Extract<Node, { type: 'part' }> {
    if (!isPart(node)) {
        throw new TypeError(message || `Expected Part but got ${node?.type || 'null/undefined'}`);
    }
}

/**
 * Assert that a node is a Book, throws if not
 * @throws {TypeError} if node is not a Book
 */
export function assertBook(node: Node | null | undefined, message?: string): asserts node is Extract<Node, { type: 'book' }> {
    if (!isBook(node)) {
        throw new TypeError(message || `Expected Book but got ${node?.type || 'null/undefined'}`);
    }
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard to check if a node has content (Scene or Beat)
 */
export function hasContent(node: Node | null | undefined): node is Extract<Node, { type: 'scene' | 'beat' }> {
    return isScene(node) || isBeat(node);
}

/**
 * Type guard to check if a node is a container (Chapter, Act, Part, Book)
 */
export function isContainer(node: Node | null | undefined): node is Extract<Node, { type: 'chapter' | 'act' | 'part' | 'book' }> {
    return isChapter(node) || isAct(node) || isPart(node) || isBook(node);
}

/**
 * Type guard to check if a node can have children
 */
export function canHaveChildren(node: Node | null | undefined): boolean {
    return isContainer(node);
}

// ============================================================================
// Safe Access Helpers
// ============================================================================

/**
 * Safely get scene content, returns null if not a scene
 */
export function getSceneContent(node: Node | null | undefined): string | null {
    return isScene(node) ? node.content : null;
}

/**
 * Safely get beat content, returns null if not a beat
 */
export function getBeatContent(node: Node | null | undefined): string | null {
    return isBeat(node) ? node.content : null;
}

/**
 * Safely get any content (scene or beat), returns null if no content
 */
export function getAnyContent(node: Node | null | undefined): string | null {
    if (isScene(node)) return node.content;
    if (isBeat(node)) return node.content;
    return null;
}
