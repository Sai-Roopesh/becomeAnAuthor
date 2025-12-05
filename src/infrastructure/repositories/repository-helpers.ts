/**
 * Repository Helper Functions
 * 
 * Shared utilities for repository implementations to ensure consistent
 * data handling and storage practices.
 */

/**
 * Serializes data for IndexedDB storage
 * 
 * Why: IndexedDB cannot store:
 * - Promises
 * - Functions
 * - Circular references
 * - Symbols
 * 
 * This helper ensures data is clean before storage by round-tripping through JSON.
 * 
 * Performance Note: JSON.parse(JSON.stringify()) has a cost, but ensures correctness.
 * For very large objects (10,000+ nodes), this may take 10-50ms. This is acceptable
 * for the correctness guarantee.
 * 
 * @param data - The data to serialize
 * @returns A clean copy safe for IndexedDB storage
 * 
 * @example
 * ```typescript
 * const cleanData = serializeForStorage(userData);
 * await db.table.add(cleanData);
 * ```
 */
export function serializeForStorage<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
}

/**
 * Serializes an array of items for bulk operations
 * 
 * More efficient than calling serializeForStorage in a loop as it does
 * a single JSON round-trip for the entire array.
 * 
 * @param items - Array of items to serialize
 * @returns Clean array safe for IndexedDB bulkAdd operations
 * 
 * @example
 * ```typescript
 * const cleanItems = serializeArrayForStorage(items);
 * await db.table.bulkAdd(cleanItems);
 * ```
 */
export function serializeArrayForStorage<T>(items: T[]): T[] {
    return JSON.parse(JSON.stringify(items));
}
